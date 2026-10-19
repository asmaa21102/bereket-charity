<?php

namespace App\Console\Commands;

use App\Services\DonationService;
use Illuminate\Console\Command;

class ChargeRecurring extends Command
{
    protected $signature = 'charity:charge-recurring';

    protected $description = 'Charge the weekly and monthly donations that are due today (simulated payments)';

    public function handle(DonationService $service): int
    {
        $this->info($service->chargeDueRecurring().' recurring donations charged.');

        return self::SUCCESS;
    }
}
