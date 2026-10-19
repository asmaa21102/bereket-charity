<?php

namespace Tests;

use App\Models\Campaign;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Requests come from the app's own pages, like the real SPA (Sanctum's stateful cookie mode).
        $this->withHeader('Referer', 'http://localhost:8103/');
    }

    protected function campaign(array $overrides = []): Campaign
    {
        return Campaign::create($overrides + [
            'slug' => 'water-'.uniqid(),
            'category' => 'water',
            'title' => ['ar' => 'آبار مياه', 'en' => 'Water wells', 'tr' => 'Su kuyuları'],
            'summary' => ['ar' => 'ملخص', 'en' => 'Summary'],
            'goal_amount' => 10000,
            'unit_price' => 250,
            'unit_label' => ['ar' => 'فلتر', 'en' => 'filter'],
            'fund_types' => ['sadaqah', 'jariyah', 'general'],
            'status' => 'active',
        ]);
    }

    protected function user(string $role = 'user', array $attrs = []): User
    {
        return User::factory()->create($attrs + ['role' => $role]);
    }

    /** A card payment with the demo gateway's test numbers. */
    protected function card(string $number = '4242424242424242'): array
    {
        return ['method' => 'card', 'number' => $number, 'expiry' => '12/'.(now()->year % 100 + 2), 'cvc' => '123'];
    }
}
