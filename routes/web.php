<?php

use Illuminate\Support\Facades\Route;

// The React single-page app (built into public/app). Every non-API path returns it.
Route::get('/{any?}', function () {
    $index = public_path('app/index.html');
    abort_unless(is_file($index), 503, 'Front end not built yet: cd frontend && npm run build');

    return response()->file($index, ['Cache-Control' => 'no-cache']);
})->where('any', '^(?!api|sanctum|storage|up).*$');
