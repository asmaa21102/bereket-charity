<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

/** Session sign-in for the React app (Sanctum SPA), with an optional two-factor step. */
class AuthController extends Controller
{
    public static function userPayload(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'locale' => $user->locale,
            'two_factor' => $user->hasTwoFactor(),
            'is_volunteer' => $user->volunteer?->status === 'approved',
            'unread' => $user->unreadNotifications()->count(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => self::userPayload($request->user())]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9 ()-]{7,20}$/'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        $user = User::create($data + ['locale' => app()->getLocale()]);
        Auth::login($user);
        $request->session()->regenerate();
        AuditLog::record('user.registered', $user);

        return response()->json(['user' => self::userPayload($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $key = 'login:'.strtolower($credentials['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => __('api.too_many', ['seconds' => RateLimiter::availableIn($key)])]);
        }
        if (! Auth::validate($credentials)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['email' => __('api.login_failed')]);
        }
        RateLimiter::clear($key);
        $user = User::where('email', $credentials['email'])->first();
        if ($user->is_suspended) {
            throw ValidationException::withMessages(['email' => __('api.suspended')]);
        }

        // Second step: the code from the authenticator app.
        if ($user->hasTwoFactor()) {
            $request->session()->put('two_factor_user', $user->id);
            $request->session()->put('two_factor_remember', $request->boolean('remember'));

            return response()->json(['two_factor' => true]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json(['user' => self::userPayload($user)]);
    }

    public function twoFactorChallenge(Request $request, Google2FA $google2fa): JsonResponse
    {
        $request->validate(['code' => ['required', 'digits:6']]);
        $user = User::find($request->session()->get('two_factor_user'));
        $key = 'twofa:'.$request->ip();
        if (! $user || RateLimiter::tooManyAttempts($key, 5) || ! $google2fa->verifyKey($user->two_factor_secret, $request->input('code'), 1)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['code' => __('api.two_factor_invalid')]);
        }
        RateLimiter::clear($key);
        Auth::login($user, (bool) $request->session()->pull('two_factor_remember'));
        $request->session()->forget('two_factor_user');
        $request->session()->regenerate();
        AuditLog::record('user.two_factor_login', $user);

        return response()->json(['user' => self::userPayload($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }
}
