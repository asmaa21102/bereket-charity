<?php

use App\Http\Controllers\Api;
use App\Http\Controllers\Api\Admin;
use Illuminate\Support\Facades\Route;

// ── Public ──────────────────────────────────────────────────────────────
Route::get('meta', [Api\PublicController::class, 'meta']);
Route::get('home', [Api\PublicController::class, 'home']);
Route::get('campaigns', [Api\PublicController::class, 'campaigns']);
Route::get('campaigns/{campaign}', [Api\PublicController::class, 'campaign']);
Route::get('gifts/{token}', [Api\PublicController::class, 'gift'])->where('token', '[A-Za-z0-9]{32}');
Route::get('orders/{order}', [Api\PublicController::class, 'order']);
Route::post('checkout', [Api\CheckoutController::class, 'store'])->middleware('throttle:checkout');

// ── Accounts ────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::get('me', [Api\AuthController::class, 'me']);
    Route::post('register', [Api\AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('login', [Api\AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('two-factor', [Api\AuthController::class, 'twoFactorChallenge'])->middleware('throttle:two-factor');
    Route::post('logout', [Api\AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::patch('account', [Api\AccountController::class, 'update']);
    Route::put('account/password', [Api\AccountController::class, 'password'])->middleware('throttle:password');
    Route::get('account/two-factor', [Api\TwoFactorController::class, 'setup']);
    Route::post('account/two-factor', [Api\TwoFactorController::class, 'confirm'])->middleware('throttle:two-factor');
    Route::delete('account/two-factor', [Api\TwoFactorController::class, 'disable']);
    Route::get('notifications', [Api\AccountController::class, 'notifications']);
    Route::post('notifications/read', [Api\AccountController::class, 'readNotifications']);

    // Donor wallet
    Route::get('wallet', [Api\WalletController::class, 'index']);
    Route::get('donations/{donation}', [Api\WalletController::class, 'show']);
    Route::patch('recurring/{recurring}', [Api\WalletController::class, 'updateRecurring']);

    // Beneficiary
    Route::get('aid-requests', [Api\AidRequestController::class, 'index']);
    Route::post('aid-requests', [Api\AidRequestController::class, 'store'])->middleware('throttle:aid-request');
    Route::get('aid-requests/{aidRequest}', [Api\AidRequestController::class, 'show']);
    Route::get('aid-documents/{document}', [Api\AidRequestController::class, 'document']);

    // Volunteer
    Route::get('volunteer', [Api\VolunteerController::class, 'show']);
    Route::post('volunteer', [Api\VolunteerController::class, 'apply']);
    Route::post('volunteer/tasks/{task}/done', [Api\VolunteerController::class, 'completeTask']);

    // ── Administration (staff: requests & volunteers · admin: everything) ──
    Route::prefix('admin')->middleware('role:staff')->group(function () {
        Route::get('overview', Admin\OverviewController::class);
        Route::get('aid-requests', [Admin\AidReviewController::class, 'index']);
        Route::get('aid-requests/{aidRequest}', [Admin\AidReviewController::class, 'show']);
        Route::post('aid-requests/{aidRequest}/status', [Admin\AidReviewController::class, 'transition']);
        Route::get('volunteers', [Admin\PeopleController::class, 'volunteers']);
        Route::post('volunteers/{volunteer}', [Admin\PeopleController::class, 'reviewVolunteer']);
        Route::post('tasks', [Admin\PeopleController::class, 'saveTask']);
        Route::put('tasks/{task}', [Admin\PeopleController::class, 'saveTask']);

        Route::middleware('role:admin')->group(function () {
            Route::get('campaigns', [Admin\CampaignController::class, 'index']);
            Route::post('campaigns', [Admin\CampaignController::class, 'store']);
            Route::get('campaigns/{campaign:id}', [Admin\CampaignController::class, 'show']);
            Route::post('campaigns/{campaign:id}', [Admin\CampaignController::class, 'update']); // POST: multipart with a cover image
            Route::delete('campaigns/{campaign:id}', [Admin\CampaignController::class, 'destroy']);
            Route::post('campaigns/{campaign:id}/updates', [Admin\CampaignController::class, 'addUpdate']);
            Route::delete('campaign-updates/{update}', [Admin\CampaignController::class, 'deleteUpdate']);

            Route::get('donations', [Admin\FinanceController::class, 'donations']);
            Route::get('donations/export', [Admin\FinanceController::class, 'exportDonations']);
            Route::get('disbursements', [Admin\FinanceController::class, 'disbursements']);
            Route::post('disbursements', [Admin\FinanceController::class, 'storeDisbursement']);
            Route::get('reports/financial', [Admin\FinanceController::class, 'report']);
            Route::get('reports/financial/export', [Admin\FinanceController::class, 'exportReport']);

            Route::get('users', [Admin\PeopleController::class, 'users']);
            Route::patch('users/{user}', [Admin\PeopleController::class, 'updateUser']);
            Route::get('audit', [Admin\PeopleController::class, 'audit']);
            Route::get('settings', [Admin\PeopleController::class, 'settings']);
            Route::put('settings', [Admin\PeopleController::class, 'saveSettings']);
        });
    });
});
