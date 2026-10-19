<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Controller;
use App\Models\AidRequest;
use App\Models\AuditLog;
use App\Models\Disbursement;
use App\Notifications\AppNotification;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Staff review of aid requests: submitted → under review → approved → disbursed (or rejected).
 * Disbursing records the payment as money out of the chosen fund.
 */
class AidReviewController extends Controller
{
    private const FLOW = [
        'submitted' => ['under_review', 'approved', 'rejected'],
        'under_review' => ['approved', 'rejected'],
        'approved' => ['disbursed', 'rejected'],
        'rejected' => ['under_review'],
        'disbursed' => [],
    ];

    public function index(Request $request): JsonResponse
    {
        $q = AidRequest::with('user:id,name,email')->latest();
        if (in_array($request->query('status'), Charity::AID_STATUSES, true)) {
            $q->where('status', $request->query('status'));
        }
        if (in_array($request->query('type'), Charity::AID_TYPES, true)) {
            $q->where('type', $request->query('type'));
        }

        return response()->json(['requests' => $q->get()->map(fn (AidRequest $r) => [
            'id' => $r->id, 'reference' => $r->reference, 'type' => $r->type, 'title' => $r->title, 'status' => $r->status,
            'amount_requested' => (float) $r->amount_requested, 'approved_amount' => $r->approved_amount ? (float) $r->approved_amount : null,
            'city' => $r->city, 'family_size' => $r->family_size, 'applicant' => $r->user?->name, 'created_at' => $r->created_at->toIso8601String(),
            'documents' => $r->documents()->count(),
        ])]);
    }

    public function show(AidRequest $aidRequest): JsonResponse
    {
        AuditLog::record('aid.viewed', $aidRequest);

        return response()->json(['request' => AidRequestController::payload($aidRequest, true) + [
            'applicant' => ['name' => $aidRequest->user->name, 'email' => $aidRequest->user->email, 'previous' => AidRequest::where('user_id', $aidRequest->user_id)->where('id', '!=', $aidRequest->id)->count()],
            'reviewer' => $aidRequest->reviewer?->name,
            'next' => self::FLOW[$aidRequest->status],
        ]]);
    }

    public function transition(Request $request, AidRequest $aidRequest): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Charity::AID_STATUSES)],
            'note' => [Rule::requiredIf($request->input('status') === 'rejected'), 'nullable', 'string', 'max:1000'],
            'approved_amount' => [Rule::requiredIf($request->input('status') === 'approved'), 'nullable', 'numeric', 'between:1,500000'],
            'fund_type' => [Rule::requiredIf($request->input('status') === 'approved'), 'nullable', Rule::in(Charity::FUND_TYPES)],
        ]);
        $from = $aidRequest->status;
        abort_unless(in_array($data['status'], self::FLOW[$from], true), 422, __('api.status_not_allowed'));

        DB::transaction(function () use ($aidRequest, $data, $request, $from) {
            $changes = ['status' => $data['status'], 'reviewer_id' => $request->user()->id];
            if ($data['status'] === 'approved') {
                $changes += ['approved_amount' => $data['approved_amount'], 'fund_type' => $data['fund_type']];
            }
            if (! empty($data['note'])) {
                $changes['decision_note'] = $data['note'];
            }
            $aidRequest->update($changes);
            if ($data['status'] === 'disbursed') {
                Disbursement::create([
                    'fund_type' => $aidRequest->fund_type ?? 'general',
                    'aid_request_id' => $aidRequest->id,
                    'amount' => $aidRequest->approved_amount,
                    'description' => 'Aid '.$aidRequest->reference.' ('.$aidRequest->type.')',
                    'paid_on' => today(),
                    'created_by' => $request->user()->id,
                ]);
            }
            $aidRequest->events()->create(['actor_id' => $request->user()->id, 'from_status' => $from, 'to_status' => $data['status'], 'note' => $data['note'] ?? null]);
        });

        AuditLog::record('aid.'.$data['status'], $aidRequest, ['from' => $from, 'amount' => $data['approved_amount'] ?? null, 'fund' => $data['fund_type'] ?? null]);
        $aidRequest->user->notify(new AppNotification('aid_status', ['reference' => $aidRequest->reference, 'status' => $data['status']], '/aid/'.$aidRequest->id, email: true));

        return response()->json(['request' => AidRequestController::payload($aidRequest->fresh(), true)]);
    }
}
