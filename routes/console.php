<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Weekly / monthly donations (simulated charges).
Illuminate\Support\Facades\Schedule::command('charity:charge-recurring')->dailyAt('09:00');
