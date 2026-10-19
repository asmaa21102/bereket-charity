<?php

namespace Tests\Feature;

use App\Models\Donation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AdminSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_guard_the_administration(): void
    {
        $this->getJson('/api/admin/overview')->assertUnauthorized();
        $this->actingAs($this->user())->getJson('/api/admin/overview')->assertForbidden();

        $staff = $this->user('staff');
        $this->actingAs($staff)->getJson('/api/admin/overview')->assertOk();
        $this->actingAs($staff)->getJson('/api/admin/aid-requests')->assertOk();
        $this->actingAs($staff)->getJson('/api/admin/campaigns')->assertForbidden(); // finance & campaigns are admin-only
        $this->actingAs($staff)->getJson('/api/admin/reports/financial')->assertForbidden();

        $this->actingAs($this->user('admin'))->getJson('/api/admin/reports/financial')->assertOk();
    }

    public function test_staff_must_enable_two_factor_when_required(): void
    {
        config(['charity.admin_2fa' => 'required']);
        $admin = $this->user('admin');
        $this->actingAs($admin)->getJson('/api/admin/overview')->assertForbidden()->assertJsonPath('code', 'two_factor_required');

        $admin->forceFill(['two_factor_secret' => (new Google2FA)->generateSecretKey(), 'two_factor_confirmed_at' => now()])->save();
        $this->actingAs($admin->fresh())->getJson('/api/admin/overview')->assertOk();
    }

    public function test_login_with_two_factor_needs_the_code(): void
    {
        $g = new Google2FA;
        $secret = $g->generateSecretKey();
        $user = $this->user('user', ['email' => 'tf@example.com', 'two_factor_secret' => $secret, 'two_factor_confirmed_at' => now()]);

        $this->postJson('/api/auth/login', ['email' => 'tf@example.com', 'password' => 'password'])->assertOk()->assertJson(['two_factor' => true]);
        $this->assertGuest();
        $this->postJson('/api/auth/two-factor', ['code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/auth/two-factor', ['code' => $g->getCurrentOtp($secret)])->assertOk()->assertJsonPath('user.id', $user->id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_the_two_factor_secret_is_encrypted_in_the_database(): void
    {
        $user = $this->user('user', ['two_factor_secret' => 'JBSWY3DPEHPK3PXP']);
        $this->assertStringNotContainsString('JBSWY3DPEHPK3PXP', \DB::table('users')->where('id', $user->id)->value('two_factor_secret'));
    }

    public function test_a_suspended_user_is_signed_out(): void
    {
        $user = $this->user();
        $this->actingAs($user)->getJson('/api/wallet')->assertOk();
        $user->forceFill(['is_suspended' => true])->save();
        $this->actingAs($user->fresh())->getJson('/api/wallet')->assertForbidden()->assertJsonPath('code', 'suspended');
    }

    public function test_a_suspended_user_cannot_sign_in(): void
    {
        $user = $this->user('user', ['is_suspended' => true]);
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->user('admin');
        $this->actingAs($admin)->patchJson("/api/admin/users/{$admin->id}", ['role' => 'user'])->assertUnprocessable();
        $other = $this->user();
        $this->actingAs($admin)->patchJson("/api/admin/users/{$other->id}", ['role' => 'staff'])->assertOk();
        $this->assertSame('staff', $other->fresh()->role);
    }

    public function test_financial_report_separates_funds_and_csv_is_safe(): void
    {
        $admin = $this->user('admin');
        $this->actingAs($admin)->postJson('/api/checkout', ['items' => [['fund_type' => 'zakat', 'amount' => 1000], ['fund_type' => 'sadaqah', 'amount' => 400]], 'payment' => $this->card()])->assertCreated();
        $this->actingAs($admin)->postJson('/api/admin/disbursements', ['fund_type' => 'zakat', 'amount' => 300, 'description' => 'Food for 3 families', 'paid_on' => today()->toDateString()])->assertCreated();

        $funds = collect($this->actingAs($admin)->getJson('/api/admin/reports/financial')->assertOk()->json('funds'))->keyBy('fund');
        $this->assertEquals(700, $funds['zakat']['balance']);
        $this->assertEquals(400, $funds['sadaqah']['balance']);

        Donation::query()->update(['donor_name' => '=HYPERLINK("http://evil")']);
        $csv = $this->actingAs($admin)->get('/api/admin/donations/export')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_api_messages_follow_the_requested_language(): void
    {
        $body = ['items' => [['fund_type' => 'general', 'amount' => 100]], 'donor' => ['name' => 'X', 'email' => 'x@example.com'], 'payment' => $this->card('4000000000000002')];
        $ar = $this->withHeader('X-Locale', 'ar')->postJson('/api/checkout', $body)->json('message');
        $tr = $this->withHeader('X-Locale', 'tr')->postJson('/api/checkout', $body)->json('message');
        $this->assertNotSame($ar, $tr);
        $this->assertMatchesRegularExpression('/\p{Arabic}/u', $ar);
    }
}
