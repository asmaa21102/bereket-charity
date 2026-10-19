<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AidDocument;
use App\Models\AidRequest;
use App\Models\AuditLog;
use App\Services\AidDocuments;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/** Requests for help from people in need (their own view). */
class AidRequestController extends Controller
{
    public static function payload(AidRequest $r, bool $staff = false): array
    {
        $r->loadMissing(['documents', 'events.actor']);

        return [
            'id' => $r->id,
            'reference' => $r->reference,
            'type' => $r->type,
            'title' => $r->title,
            'description' => $r->description,
            'amount_requested' => (float) $r->amount_requested,
            'approved_amount' => $r->approved_amount ? (float) $r->approved_amount : null,
            'fund_type' => $r->fund_type,
            'family_size' => $r->family_size,
            'city' => $r->city,
            'phone' => $r->phone,
            'status' => $r->status,
            'decision_note' => $r->decision_note,
            'created_at' => $r->created_at->toIso8601String(),
            'documents' => $r->documents->map(fn (AidDocument $d) => ['id' => $d->id, 'kind' => $d->kind, 'name' => $d->original_name, 'size' => $d->size, 'mime' => $d->mime]),
            'events' => $r->events->map(fn ($e) => [
                'to' => $e->to_status,
                'at' => $e->created_at->toIso8601String(),
                'note' => $staff || in_array($e->to_status, ['approved', 'rejected', 'disbursed'], true) ? $e->note : null,
                'by' => $staff ? $e->actor?->name : null,
            ]),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(['requests' => $request->user()->aidRequests()->latest()->get()->map(fn ($r) => self::payload($r))]);
    }

    public function show(Request $request, AidRequest $aidRequest): JsonResponse
    {
        abort_unless($aidRequest->user_id === $request->user()->id, 404);

        return response()->json(['request' => self::payload($aidRequest)]);
    }

    public function store(Request $request, AidDocuments $docs): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(Charity::AID_TYPES)],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'min:30', 'max:4000'],
            'amount_requested' => ['required', 'numeric', 'between:100,500000'],
            'family_size' => ['required', 'integer', 'between:1,30'],
            'city' => ['required', 'string', 'max:60'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9 ()-]{7,20}$/'],
            'documents' => ['required', 'array', 'min:1', 'max:6'],
            'documents.*.file' => ['required', 'file', 'max:5120', 'mimes:pdf,jpg,jpeg,png,webp'],
            'documents.*.kind' => ['required', Rule::in(Charity::DOC_KINDS)],
            'consent' => ['accepted'],
        ]);

        $aid = DB::transaction(function () use ($data, $request, $docs) {
            $aid = AidRequest::create([
                'reference' => 'TMP'.uniqid(),
                'user_id' => $request->user()->id,
            ] + collect($data)->except(['documents', 'consent'])->all());
            $aid->update(['reference' => sprintf('AID-%s-%04d', now()->format('Y'), $aid->id)]);
            foreach ($data['documents'] as $doc) {
                $docs->store($aid, $doc['file'], $doc['kind']);
            }
            $aid->events()->create(['actor_id' => $request->user()->id, 'to_status' => 'submitted']);

            return $aid;
        });
        AuditLog::record('aid.submitted', $aid, ['type' => $aid->type]);

        return response()->json(['request' => self::payload($aid->fresh())], 201);
    }

    /** Opens a document: its owner or staff only. Staff access is written to the audit log. */
    public function document(Request $request, AidDocument $document, AidDocuments $docs): Response
    {
        $aid = AidRequest::findOrFail($document->aid_request_id);
        $user = $request->user();
        abort_unless($aid->user_id === $user->id || $user->isStaff(), 404);
        if ($aid->user_id !== $user->id) {
            AuditLog::record('aid.document_viewed', $aid, ['document' => $document->id]);
        }

        return response($docs->contents($document), 200, [
            'Content-Type' => $document->mime,
            'Content-Disposition' => 'inline; filename="'.addslashes($document->original_name).'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
