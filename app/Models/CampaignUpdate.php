<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignUpdate extends Model
{
    use HasTranslations;

    protected $guarded = ['id'];

    protected $casts = ['title' => 'array', 'body' => 'array', 'published_at' => 'datetime'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'stage' => $this->stage,
            'title' => $this->t('title'),
            'body' => $this->t('body'),
            'image' => $this->image ? asset($this->image) : null,
            'published_at' => $this->published_at?->toIso8601String(),
            'campaign' => $this->relationLoaded('campaign') && $this->campaign ? ['slug' => $this->campaign->slug, 'title' => $this->campaign->t('title')] : null,
        ];
    }
}
