<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AidRequest;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\Disbursement;
use App\Models\Donation;
use App\Models\RecurringDonation;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\JsonResponse;

class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $paid = Donation::where('status', 'paid');
        $days = (clone $paid)->where('paid_at', '>=', now()->subDays(29)->startOfDay())
            ->selectRaw('DATE(paid_at) d, SUM(amount) total, COUNT(*) n')->groupBy('d')->orderBy('d')->get()->keyBy('d');
        $series = collect(range(29, 0))->map(function ($i) use ($days) {
            $d = now()->subDays($i)->toDateString();

            return ['date' => $d, 'total' => (float) ($days[$d]->total ?? 0), 'count' => (int) ($days[$d]->n ?? 0)];
        });

        return response()->json([
            'kpis' => [
                'raised' => (float) (clone $paid)->sum('amount'),
                'raised_month' => (float) (clone $paid)->where('paid_at', '>=', now()->startOfMonth())->sum('amount'),
                'donations' => (clone $paid)->count(),
                'donors' => (clone $paid)->selectRaw('COUNT(DISTINCT COALESCE(user_id, donor_email)) n')->value('n') ?? 0,
                'recurring' => RecurringDonation::where('status', 'active')->count(),
                'recurring_monthly_value' => (float) RecurringDonation::where('status', 'active')->get()->sum(fn ($r) => $r->frequency === 'weekly' ? $r->amount * 4.33 : $r->amount),
                'spent' => (float) Disbursement::sum('amount'),
                'active_campaigns' => Campaign::where('status', 'active')->count(),
                'pending_requests' => AidRequest::whereIn('status', ['submitted', 'under_review'])->count(),
                'pending_volunteers' => Volunteer::where('status', 'pending')->count(),
                'users' => User::count(),
            ],
            'series' => $series,
            'by_fund' => (clone $paid)->selectRaw('fund_type, SUM(amount) total')->groupBy('fund_type')->get()->map(fn ($r) => ['fund' => $r->fund_type, 'total' => (float) $r->total]),
            'by_method' => (clone $paid)->selectRaw('payment_method, COUNT(*) n')->groupBy('payment_method')->get()->map(fn ($r) => ['method' => $r->payment_method, 'count' => (int) $r->n]),
            'top_campaigns' => Campaign::orderByDesc('raised_amount')->limit(5)->get()->map->card(),
            'activity' => AuditLog::with('user:id,name')->latest()->limit(10)->get()->map(fn ($a) => ['action' => $a->action, 'user' => $a->user?->name, 'subject' => $a->subject_type ? $a->subject_type.' #'.$a->subject_id : null, 'at' => $a->created_at->toIso8601String()]),
        ]);
    }
}
