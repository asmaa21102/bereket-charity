<?php

namespace App\Support;

/** Fixed lists used across the app (labels live in the front-end dictionaries). */
final class Charity
{
    // Fund types keep money in its proper (Sharia / legal) category.
    public const FUND_TYPES = ['zakat', 'sadaqah', 'jariyah', 'kaffarah', 'general'];

    public const CATEGORIES = ['food', 'orphans', 'water', 'housing', 'health', 'education', 'winter', 'emergency'];

    public const AID_TYPES = ['medical', 'education', 'financial', 'rent'];

    public const AID_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'disbursed'];

    public const DOC_KINDS = ['id', 'medical', 'income', 'other'];

    public const PRESET_AMOUNTS = [100, 250, 500, 1000];

    public const SKILLS = ['logistics', 'driving', 'medical', 'teaching', 'media', 'translation', 'it', 'fundraising'];

    public const CURRENCY = 'TRY';
}
