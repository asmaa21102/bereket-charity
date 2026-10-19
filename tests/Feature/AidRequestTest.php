<?php

namespace Tests\Feature;

use App\Models\AidDocument;
use App\Models\AidRequest;
use App\Models\AuditLog;
use App\Models\Disbursement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AidRequestTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'My daughter needs knee surgery, the hospital asks 18000 TRY.';

    private function submit($user): AidRequest
    {
        $this->actingAs($user)->post('/api/aid-requests', [
            'type' => 'medical', 'title' => 'Surgery', 'description' => self::SECRET, 'amount_requested' => 18000,
            'family_size' => 4, 'city' => 'Karabük', 'phone' => '+90 555 000 00 08', 'consent' => '1',
            'documents' => [['file' => UploadedFile::fake()->createWithContent('report.pdf', '%PDF-1.4 medical report PLAINTEXT'), 'kind' => 'medical']],
        ], ['Accept' => 'application/json'])->assertCreated();

        return AidRequest::latest('id')->firstOrFail();
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_description_phone_and_documents_are_encrypted_at_rest(): void
    {
        $r = $this->submit($this->user());
        $row = DB::table('aid_requests')->find($r->id);
        $this->assertStringNotContainsString('knee surgery', $row->description);
        $this->assertStringNotContainsString('555', $row->phone);
        $this->assertSame(self::SECRET, $r->description); // decrypted by the model

        $doc = AidDocument::firstOrFail();
        $this->assertStringNotContainsString('PLAINTEXT', Storage::disk('local')->get($doc->path));
    }

    public function test_only_the_applicant_and_staff_can_open_a_request_and_its_documents(): void
    {
        $owner = $this->user();
        $r = $this->submit($owner);
        $doc = AidDocument::firstOrFail();

        $this->actingAs($owner)->getJson("/api/aid-requests/{$r->id}")->assertOk();
        $this->actingAs($owner)->get("/api/aid-documents/{$doc->id}")->assertOk()->assertSee('PLAINTEXT');

        $stranger = $this->user();
        $this->actingAs($stranger)->getJson("/api/aid-requests/{$r->id}")->assertNotFound();
        $this->actingAs($stranger)->getJson("/api/aid-documents/{$doc->id}")->assertNotFound();

        $staff = $this->user('staff');
        $this->actingAs($staff)->get("/api/aid-documents/{$doc->id}")->assertOk();
        $this->assertTrue(AuditLog::where('action', 'aid.document_viewed')->where('user_id', $staff->id)->exists());
    }

    public function test_a_request_needs_documents_and_consent(): void
    {
        $this->actingAs($this->user())->postJson('/api/aid-requests', [
            'type' => 'rent', 'title' => 'Rent', 'description' => str_repeat('x', 40), 'amount_requested' => 5000, 'family_size' => 2, 'city' => 'X', 'phone' => '+90 555 111 22 33',
        ])->assertUnprocessable()->assertJsonValidationErrors(['documents', 'consent']);
    }

    public function test_review_flow_approves_then_disburses_from_the_chosen_fund(): void
    {
        $r = $this->submit($this->user());
        $staff = $this->user('staff');
        $go = fn (array $body) => $this->actingAs($staff)->postJson("/api/admin/aid-requests/{$r->id}/status", $body);

        $go(['status' => 'disbursed'])->assertUnprocessable(); // must be approved first
        $go(['status' => 'approved'])->assertUnprocessable()->assertJsonValidationErrors(['approved_amount', 'fund_type']);
        $go(['status' => 'approved', 'approved_amount' => 9000, 'fund_type' => 'zakat', 'note' => 'Two months'])->assertOk();
        $go(['status' => 'disbursed'])->assertOk()->assertJsonPath('request.status', 'disbursed');

        $x = Disbursement::firstOrFail();
        $this->assertSame('zakat', $x->fund_type);
        $this->assertEquals(9000, $x->amount);
        $this->assertSame(1, $r->user->notifications()->where('data->key', 'aid_status')->where('data->params->status', 'disbursed')->count());
    }

    public function test_rejecting_requires_a_note(): void
    {
        $r = $this->submit($this->user());
        $this->actingAs($this->user('staff'))->postJson("/api/admin/aid-requests/{$r->id}/status", ['status' => 'rejected'])
            ->assertUnprocessable()->assertJsonValidationErrors('note');
    }
}
