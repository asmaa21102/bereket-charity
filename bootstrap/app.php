<?php

use App\Http\Middleware\BlockSuspended;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // The React app is served from the same origin and signs in with a session cookie (Sanctum SPA mode).
        $middleware->statefulApi();
        $middleware->api(append: [SetLocale::class, BlockSuspended::class]);
        $middleware->alias(['role' => EnsureRole::class]);
        $middleware->throttleApi('api');
        // No server-side login page: guests who open a protected link go to the app's sign-in screen.
        $middleware->redirectGuestsTo('/login');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Every API error is JSON.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
    })->create();
