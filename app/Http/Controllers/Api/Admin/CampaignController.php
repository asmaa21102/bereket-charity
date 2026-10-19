<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\CampaignUpdate;
use App\Models\User;
use App\Notifications\AppNotification;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Campaigns and their field updates (which donors see as "where my money went"). */
class CampaignController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['campaigns' => Campaign::orderBy('sort_order')->get()->map(fn (Campaign $c) => $c->card() + ['updates_count' => $c->updates()->count()])]);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        return response()->json(['campaign' => $campaign->only(['id', 'slug', 'category', 'title', 'summary', 'story', 'goal_amount', 'unit_price', 'unit_label', 'fund_types', 'impact_levels', 'is_urgent', 'status', 'ends_on', 'sort_order']) + [
            'cover' => $campaign->cover ? asset($campaign->cover) : null,
            'raised' => (float) $campaign->raised_amount,
            'updates' => $campaign->updates()->get()->map(fn (CampaignUpdate $u) => $u->toCard() + ['title_all' => $u->title, 'body_all' => $u->body]),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $campaign = Campaign::create($this->validated($request) + ['sort_order' => (int) Campaign::max('sort_order') + 1]);
        $this->saveCover($request, $campaign);
        AuditLog::record('campaign.created', $campaign);

        return response()->json(['id' => $campaign->id, 'slug' => $campaign->slug], 201);
    }

    public function update(Request $request, Campaign $campaign): JsonResponse
    {
        $before = $campaign->only(['goal_amount', 'status']);
        $campaign->update($this->validated($request, $campaign));
        $this->saveCover($request, $campaign);
        AuditLog::record('campaign.updated', $campaign, ['before' => $before, 'after' => $campaign->only(['goal_amount', 'status'])]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Campaign $campaign): JsonResponse
    {
        abort_if($campaign->donations()->where('status', 'paid')->exists(), 422, __('api.status_not_allowed'));
        AuditLog::record('campaign.deleted', $campaign, ['title' => $campaign->title]);
        $campaign->delete();

        return response()->json(['ok' => true]);
    }

    /** Posts a field update and notifies everyone who donated to the campaign. */
    public function addUpdate(Request $request, Campaign $campaign): JsonResponse
    {
        $data = $request->validate([
            'stage' => ['required', Rule::in(['received', 'purchased', 'delivered', 'update'])],
            'title' => ['required', 'array'], 'title.ar' => ['required', 'string', 'max:200'],
            'title.en' => ['nullable', 'string', 'max:200'], 'title.tr' => ['nullable', 'string', 'max:200'],
            'body' => ['nullable', 'array'], 'body.*' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);
        $update = $campaign->updates()->create([
            'stage' => $data['stage'],
            'title' => array_filter($data['title']),
            'body' => array_filter($data['body'] ?? []) ?: null,
            'image' => $request->hasFile('image') ? $this->storeImage($request->file('image'), 'updates') : null,
            'created_by' => $request->user()->id,
            'published_at' => now(),
        ]);
        $donors = User::whereIn('id', $campaign->donations()->where('status', 'paid')->whereNotNull('user_id')->distinct()->pluck('user_id'))->get();
        Notification::send($donors, new AppNotification('campaign_update', ['campaign' => $campaign->t('title'), 'title' => $update->t('title')], '/campaigns/'.$campaign->slug));
        AuditLog::record('campaign.update_posted', $campaign, ['update' => $update->id, 'notified' => $donors->count()]);

        return response()->json(['id' => $update->id, 'notified' => $donors->count()], 201);
    }

    public function deleteUpdate(CampaignUpdate $update): JsonResponse
    {
        AuditLog::record('campaign.update_deleted', $update->campaign, ['update' => $update->id]);
        $update->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?Campaign $campaign = null): array
    {
        $text = fn ($max, $req = false) => [$req ? 'required' : 'nullable', 'string', 'max:'.$max];
        $data = $request->validate([
            'slug' => ['nullable', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('campaigns', 'slug')->ignore($campaign?->id)],
            'category' => ['required', Rule::in(Charity::CATEGORIES)],
            'title.ar' => $text(160, true), 'title.en' => $text(160), 'title.tr' => $text(160),
            'summary.ar' => $text(400, true), 'summary.en' => $text(400), 'summary.tr' => $text(400),
            'story.ar' => $text(6000), 'story.en' => $text(6000), 'story.tr' => $text(6000),
            'unit_label.ar' => $text(60), 'unit_label.en' => $text(60), 'unit_label.tr' => $text(60),
            'goal_amount' => ['required', 'numeric', 'between:100,100000000'],
            'unit_price' => ['nullable', 'numeric', 'between:1,1000000'],
            'fund_types' => ['required', 'array', 'min:1'], 'fund_types.*' => [Rule::in(Charity::FUND_TYPES)],
            'impact_levels' => ['nullable', 'array', 'max:6'],
            'impact_levels.*.amount' => ['required', 'numeric', 'min:1'],
            'impact_levels.*.text.ar' => ['required', 'string', 'max:160'],
            'impact_levels.*.text.en' => ['nullable', 'string', 'max:160'],
            'impact_levels.*.text.tr' => ['nullable', 'string', 'max:160'],
            'is_urgent' => ['boolean'],
            'status' => ['required', Rule::in(['draft', 'active', 'completed', 'closed'])],
            'ends_on' => ['nullable', 'date'],
            'cover' => ['nullable', 'image', 'max:4096'],
        ]);
        $clean = fn ($v) => is_array($v) ? array_filter($v, 'filled') : null;
        $out = collect($data)->except(['cover'])->all();
        foreach (['title', 'summary', 'story', 'unit_label'] as $f) {
            $out[$f] = $clean($data[$f] ?? null) ?: null;
        }
        $out['slug'] = $data['slug'] ?? $campaign?->slug ?? (Str::slug($data['title']['en'] ?? '') ?: 'campaign').'-'.Str::lower(Str::random(4));
        $out['impact_levels'] = collect($data['impact_levels'] ?? [])->sortBy('amount')->values()->all() ?: null;
        $out['is_urgent'] = $request->boolean('is_urgent');

        return $out;
    }

    private function saveCover(Request $request, Campaign $campaign): void
    {
        if ($request->hasFile('cover')) {
            $campaign->update(['cover' => $this->storeImage($request->file('cover'), 'campaigns')]);
        }
    }

    private function storeImage(UploadedFile $file, string $dir): string
    {
        return 'storage/'.$file->store($dir, 'public');
    }
}
