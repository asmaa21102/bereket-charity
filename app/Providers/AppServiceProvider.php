<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Each limiter has its own key, so browsing the site never uses up the sign-in attempts.
        $by = fn (Request $r, string $name) => $name.'|'.($r->user()?->id ?? $r->ip());
        $limits = ['api' => [120, 1], 'login' => [10, 1], 'register' => [6, 1], 'two-factor' => [10, 1], 'password' => [6, 1], 'checkout' => [15, 1], 'aid-request' => [5, 10]];
        foreach ($limits as $name => [$max, $minutes]) {
            RateLimiter::for($name, fn (Request $r) => Limit::perMinutes($minutes, $max)->by($by($r, $name)));
        }
    }
}
