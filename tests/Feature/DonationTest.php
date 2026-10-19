<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Donation;
use App\Models\Order;
use App\Models\RecurringDonation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_donation_issues_a_receipt_and_updates_the_campaign(): void
    {
        $c = $this->campaign();
        $res = $this->postJson('/api/checkout', [
            'items' => [['campaign_id' => $c->id, 'fund_type' => 'jariyah', 'amount' => 500]],
            'donor' => ['name' => 'Sara', 'email' => 'sara@example.com'],
            'payment' => $this->card(),
        ])->assertCreated();

        $this->assertMatchesRegularExpression('/^BRK-\d{4}-\d{6}$/', $res->json('receipts.0'));
        $d = Donation::first();
        $this->assertSame('paid', $d->status);
        $this->assertSame('4242', $d->card_last4);
        $this->assertEquals(500, $c->fresh()->raised_amount);
        $this->assertSame(1, $c->fresh()->donors_count);

        // The thank-you/receipt page needs the order's secret token.
        $this->getJson("/api/orders/{$res->json('order_id')}?token={$res->json('token')}")->assertOk()->assertJsonPath('order.donations.0.units', 2);
        $this->getJson("/api/orders/{$res->json('order_id')}?token=wrong")->assertNotFound();
    }

    public function test_the_full_card_number_is_never_stored(): void
    {
        $this->postJson('/api/checkout', [
            'items' => [['fund_type' => 'general', 'amount' => 100]],
            'donor' => ['name' => 'A', 'email' => 'a@example.com'],
            'payment' => $this->card(),
        ])->assertCreated();

        foreach (['orders', 'donations', 'audit_logs'] as $table) {
            $dump = json_encode(DB::table($table)->get());
            $this->assertStringNotContainsString('4242424242424242', $dump, $table);
        }
    }

    public function test_declined_card_records_a_failed_order_and_raises_nothing(): void
    {
        $c = $this->campaign();
        $this->withHeader('X-Locale', 'tr')->postJson('/api/checkout', [
            'items' => [['campaign_id' => $c->id, 'fund_type' => 'sadaqah', 'amount' => 250]],
            'donor' => ['name' => 'B', 'email' => 'b@example.com'],
            'payment' => $this->card('4000000000000002'),
        ])->assertStatus(402)->assertJsonPath('code', 'card_declined');

        $this->assertSame('failed', Order::first()->status);
        $this->assertNull(Donation::first()->receipt_no);
        $this->assertEquals(0, $c->fresh()->raised_amount);
        $this->assertTrue(AuditLog::where('action', 'payment.failed')->exists());
    }

    public function test_campaign_only_accepts_its_own_fund_types(): void
    {
        $c = $this->campaign(['fund_types' => ['sadaqah']]);
        $this->postJson('/api/checkout', [
            'items' => [['campaign_id' => $c->id, 'fund_type' => 'zakat', 'amount' => 100]],
            'donor' => ['name' => 'C', 'email' => 'c@example.com'],
            'payment' => $this->card(),
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.fund_type');
    }

    public function test_reaching_the_goal_completes_the_campaign(): void
    {
        $c = $this->campaign(['goal_amount' => 300]);
        $this->postJson('/api/checkout', [
            'items' => [['campaign_id' => $c->id, 'fund_type' => 'sadaqah', 'amount' => 300]],
            'donor' => ['name' => 'D', 'email' => 'd@example.com'],
            'payment' => ['method' => 'apple_pay'],
        ])->assertCreated();
        $this->assertSame('completed', $c->fresh()->status);
    }

    public function test_monthly_donation_creates_a_plan_that_the_scheduler_charges(): void
    {
        $user = $this->user();
        $c = $this->campaign();
        $this->actingAs($user)->postJson('/api/checkout', [
            'items' => [['campaign_id' => $c->id, 'fund_type' => 'sadaqah', 'amount' => 200, 'frequency' => 'monthly']],
            'payment' => $this->card(),
        ])->assertCreated()->assertJsonFragment(['badges' => ['first_step', 'water_bringer', 'monthly_giver']]);

        $plan = RecurringDonation::firstOrFail();
        $this->assertSame('monthly', $plan->frequency);

        $this->travelTo($plan->next_charge_on->copy()->addHour());
        $this->artisan('charity:charge-recurring')->assertSuccessful();
        $this->assertSame(2, Donation::where('status', 'paid')->count());
        $this->assertSame(2, $plan->fresh()->charges_count);
        $this->assertTrue($plan->fresh()->next_charge_on->isFuture());
        $this->assertEquals(400, $c->fresh()->raised_amount);
    }

    public function test_guests_cannot_start_recurring_plans(): void
    {
        $this->postJson('/api/checkout', [
            'items' => [['fund_type' => 'general', 'amount' => 100, 'frequency' => 'monthly']],
            'donor' => ['name' => 'E', 'email' => 'e@example.com'],
            'payment' => $this->card(),
        ])->assertCreated();
        $this->assertSame(0, RecurringDonation::count());
    }

    public function test_donors_only_see_their_own_donations(): void
    {
        [$a, $b] = [$this->user(), $this->user()];
        $this->actingAs($a)->postJson('/api/checkout', ['items' => [['fund_type' => 'general', 'amount' => 100]], 'payment' => $this->card()])->assertCreated();
        $id = Donation::first()->id;

        $this->actingAs($a)->getJson("/api/donations/$id")->assertOk();
        $this->actingAs($b)->getJson("/api/donations/$id")->assertNotFound();
        $this->actingAs($a)->getJson('/api/wallet')->assertOk()->assertJsonPath('count', 1);
    }
}
