<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** The front end sends its language in X-Locale (ar, en, tr); Arabic is the default. */
class SetLocale
{
    public const LOCALES = ['ar', 'en', 'tr'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('X-Locale');
        if (! in_array($locale, self::LOCALES, true)) {
            $locale = $request->getPreferredLanguage(self::LOCALES) ?? 'ar';
        }
        app()->setLocale($locale);
        if (($user = $request->user()) && $user->locale !== $locale) {
            $user->forceFill(['locale' => $locale])->saveQuietly();
        }

        return $next($request);
    }
}
