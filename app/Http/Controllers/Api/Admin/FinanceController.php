<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Disbursement;
use App\Models\Donation;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Donations (money in), disbursements (money out) and the financial report. */
class FinanceController extends Controller
{
    private function range(Request $request): array
    {
        $from = Carbon::parse($request->query('from', now()->startOfYear()->toDateString()))->startOfDay();
        $to = Carbon::parse($request->query('to', now()->toDateString()))->endOfDay();

        return [$from, $to];
    }

    private function donationsQuery(Request $request)
    {
        [$from, $to] = $this->range($request);
        $q = Donation::with('campaign')->whereBetween('created_at', [$from, $to])->latest();
        if (in_array($request->query('status'), ['paid', 'failed', 'pending', 'refunded'], true)) {
            $q->where('status', $request->query('status'));
        }
        if (in_array($request->query('fund'), Charity::FUND_TYPES, true)) {
            $q->where('fund_type', $request->query('fund'));
        }
        if ($request->filled('campaign')) {
            $q->where('campaign_id', $request->query('campaign'));
        }
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('receipt_no', 'like', "%$s%")->orWhere('donor_name', 'like', "%$s%")->orWhere('donor_email', 'like', "%$s%"));
        }

        return $q;
    }

    public function donations(Request $request): JsonResponse
    {
        $page = $this->donationsQuery($request)->paginate(25);

        return response()->json([
            'data' => collect($page->items())->map(fn (Donation $d) => $d->summary() + ['donor_name' => $d->donor_name, 'donor_email' => $d->donor_email, 'anonymous' => $d->is_anonymous, 'created_at' => $d->created_at->toIso8601String()]),
            'total' => $page->total(), 'page' => $page->currentPage(), 'pages' => $page->lastPage(),
            'sum' => (float) $this->donationsQuery($request)->where('status', 'paid')->sum('amount'),
        ]);
    }

    public function exportDonations(Request $request): StreamedResponse
    {
        AuditLog::record('finance.export_donations', null, $request->only(['from', 'to', 'fund', 'status']));
        $rows = $this->donationsQuery($request)->get();

        return $this->csv('donations.csv', ['receipt', 'date', 'status', 'fund_type', 'amount_try', 'campaign', 'donor', 'email', 'method', 'card', 'gift_for'], $rows->map(fn (Donation $d) => [
            $d->receipt_no, $d->paid_at?->format('Y-m-d H:i') ?? $d->created_at->format('Y-m-d H:i'), $d->status, $d->fund_type, $d->amount,
            $d->campaign?->t('title'), $d->is_anonymous ? '(anonymous)' : $d->donor_name, $d->donor_email, $d->payment_method,
            $d->card_last4 ? $d->card_brand.' '.$d->card_last4 : '', $d->gift_name,
        ]));
    }

    public function disbursements(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json(['data' => Disbursement::with('campaign')->whereBetween('paid_on', [$from->toDateString(), $to->toDateString()])->latest('paid_on')->get()->map(fn (Disbursement $x) => [
            'id' => $x->id, 'fund_type' => $x->fund_type, 'amount' => (float) $x->amount, 'description' => $x->description, 'paid_on' => $x->paid_on->toDateString(),
            'campaign' => $x->campaign?->t('title'), 'aid_request_id' => $x->aid_request_id,
        ])]);
    }

    public function storeDisbursement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fund_type' => ['required', Rule::in(Charity::FUND_TYPES)],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'amount' => ['required', 'numeric', 'between:1,10000000'],
            'description' => ['required', 'string', 'max:255'],
            'paid_on' => ['required', 'date', 'before_or_equal:today'],
        ]);
        $x = Disbursement::create($data + ['created_by' => $request->user()->id]);
        AuditLog::record('finance.disbursement', $x, $data);

        return response()->json(['id' => $x->id], 201);
    }

    /** Income vs. spending per fund type: what is left in each fund must be spent on that purpose. */
    public function report(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);
        $in = Donation::where('status', 'paid')->whereBetween('paid_at', [$from, $to])->selectRaw('fund_type, SUM(amount) total, COUNT(*) n')->groupBy('fund_type')->get()->keyBy('fund_type');
        $out = Disbursement::whereBetween('paid_on', [$from->toDateString(), $to->toDateString()])->selectRaw('fund_type, SUM(amount) total')->groupBy('fund_type')->pluck('total', 'fund_type');
        $funds = collect(Charity::FUND_TYPES)->map(fn ($f) => [
            'fund' => $f, 'income' => (float) ($in[$f]->total ?? 0), 'count' => (int) ($in[$f]->n ?? 0), 'spent' => (float) ($out[$f] ?? 0),
            'balance' => (float) ($in[$f]->total ?? 0) - (float) ($out[$f] ?? 0),
        ]);
        $monthly = Donation::where('status', 'paid')->whereBetween('paid_at', [$from, $to])->selectRaw("DATE_FORMAT(paid_at, '%Y-%m') m, SUM(amount) total")->groupBy('m')->orderBy('m')->pluck('total', 'm');
        $monthlyOut = Disbursement::whereBetween('paid_on', [$from->toDateString(), $to->toDateString()])->selectRaw("DATE_FORMAT(paid_on, '%Y-%m') m, SUM(amount) total")->groupBy('m')->pluck('total', 'm');

        return response()->json([
            'from' => $from->toDateString(), 'to' => $to->toDateString(),
            'funds' => $funds,
            'income' => $funds->sum('income'), 'spent' => $funds->sum('spent'), 'balance' => $funds->sum('balance'),
            'monthly' => collect($monthly->keys()->merge($monthlyOut->keys())->unique()->sort()->values())->map(fn ($m) => ['month' => $m, 'income' => (float) ($monthly[$m] ?? 0), 'spent' => (float) ($monthlyOut[$m] ?? 0)]),
        ]);
    }

    public function exportReport(Request $request): StreamedResponse
    {
        $r = $this->report($request)->getData(true);
        AuditLog::record('finance.export_report', null, ['from' => $r['from'], 'to' => $r['to']]);
        $rows = collect($r['funds'])->map(fn ($f) => [$f['fund'], $f['count'], $f['income'], $f['spent'], $f['balance']]);
        $rows->push(['TOTAL', '', $r['income'], $r['spent'], $r['balance']]);

        return $this->csv("financial-report-{$r['from']}-{$r['to']}.csv", ['fund_type', 'donations', 'income_try', 'spent_try', 'balance_try'], $rows);
    }

    private function csv(string $name, array $header, $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows Arabic/Turkish correctly
            fputcsv($out, $header);
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($v) => is_string($v) && preg_match('/^[=+\-@]/', $v) ? "'".$v : $v, $row)); // no CSV formula injection
            }
            fclose($out);
        }, $name, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
