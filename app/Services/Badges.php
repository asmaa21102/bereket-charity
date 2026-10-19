<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBadge;

/** Titles donors earn ("Hope maker", "Orphan sponsor"…), shown on their profile. */
class Badges
{
    public const ALL = ['first_step', 'hope_maker', 'orphan_sponsor', 'monthly_giver', 'zakat_payer', 'generous', 'gift_giver', 'water_bringer'];

    /** Returns the badges newly earned by this check. */
    public function evaluate(User $user): array
    {
        $paid = $user->donations()->where('status', 'paid');
        $count = (clone $paid)->count();
        $total = (float) (clone $paid)->sum('amount');
        $inCategory = fn (string $cat) => (clone $paid)->whereHas('campaign', fn ($q) => $q->where('category', $cat))->exists();

        $earned = array_filter([
            'first_step' => $count >= 1,
            'hope_maker' => $count >= 5,
            'orphan_sponsor' => $inCategory('orphans'),
            'water_bringer' => $inCategory('water'),
            'monthly_giver' => $user->recurringDonations()->where('status', 'active')->exists(),
            'zakat_payer' => (clone $paid)->where('fund_type', 'zakat')->exists(),
            'generous' => $total >= 5000,
            'gift_giver' => (clone $paid)->whereNotNull('gift_name')->exists(),
        ]);

        $have = $user->badges()->pluck('badge')->all();
        $new = array_values(array_diff(array_keys($earned), $have));
        foreach ($new as $badge) {
            UserBadge::create(['user_id' => $user->id, 'badge' => $badge]);
        }

        return $new;
    }

    /** The "tree of good": 0–5 growth stages by total given. */
    public static function treeStage(float $total): int
    {
        return match (true) {
            $total >= 10000 => 5,
            $total >= 5000 => 4,
            $total >= 2000 => 3,
            $total >= 500 => 2,
            $total > 0 => 1,
            default => 0,
        };
    }
}
