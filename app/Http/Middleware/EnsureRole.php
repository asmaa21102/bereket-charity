<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * role:staff → staff or admin; role:admin → admin only. Admins must have two-factor
 * authentication switched on when CHARITY_ADMIN_2FA=required.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        abort_unless($user, 401);
        $ok = $role === 'admin' ? $user->isAdmin() : $user->isStaff();
        abort_unless($ok, 403, __('api.forbidden'));

        if (config('charity.admin_2fa') === 'required' && $user->isStaff() && ! $user->hasTwoFactor()) {
            return response()->json(['message' => __('api.two_factor_required'), 'code' => 'two_factor_required'], 403);
        }

        return $next($request);
    }
}
