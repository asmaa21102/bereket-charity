<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

/** Two-factor authentication (TOTP: Google Authenticator, Microsoft Authenticator…). */
class TwoFactorController extends Controller
{
    public function setup(Request $request, Google2FA $google2fa): JsonResponse
    {
        $user = $request->user();
        if (! $user->two_factor_secret || $user->hasTwoFactor()) {
            $user->forceFill(['two_factor_secret' => $google2fa->generateSecretKey(32), 'two_factor_confirmed_at' => null])->save();
        }
        $uri = $google2fa->getQRCodeUrl('Bereket', $user->email, $user->two_factor_secret);
        $svg = (new Writer(new ImageRenderer(new RendererStyle(200, 1), new SvgImageBackEnd)))->writeString($uri);

        return response()->json(['secret' => $user->two_factor_secret, 'qr' => $svg]);
    }

    public function confirm(Request $request, Google2FA $google2fa): JsonResponse
    {
        $request->validate(['code' => ['required', 'digits:6']]);
        $user = $request->user();
        if (! $user->two_factor_secret || ! $google2fa->verifyKey($user->two_factor_secret, $request->input('code'), 1)) {
            throw ValidationException::withMessages(['code' => __('api.two_factor_invalid')]);
        }
        $user->forceFill(['two_factor_confirmed_at' => now()])->save();
        AuditLog::record('user.two_factor_enabled', $user);

        return response()->json(['user' => AuthController::userPayload($user)]);
    }

    public function disable(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $request->user()->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null])->save();
        AuditLog::record('user.two_factor_disabled', $request->user());

        return response()->json(['user' => AuthController::userPayload($request->user())]);
    }
}
