<?php

// Friendly field names; the messages themselves come from Laravel's English file.
return [
    'required_if' => 'The :attribute field is required.',
    'attributes' => [
        'donor.name' => 'name', 'donor.email' => 'email', 'gift.name' => 'recipient’s name', 'gift.message' => 'message', 'gift.relation' => 'relation',
        'payment.number' => 'card number', 'payment.expiry' => 'expiry date', 'payment.cvc' => 'CVC', 'payment.method' => 'payment method',
        'items' => 'basket', 'items.*.amount' => 'amount', 'items.*.fund_type' => 'type of giving', 'items.*.frequency' => 'frequency', 'items.*.campaign_id' => 'campaign',
        'title.ar' => 'Arabic title', 'summary.ar' => 'Arabic summary', 'amount_requested' => 'amount requested', 'family_size' => 'family size',
        'documents.*.file' => 'file', 'documents.*.kind' => 'document type', 'consent' => 'declaration',
        'goal_amount' => 'goal', 'unit_price' => 'unit price', 'fund_types' => 'types of giving', 'ends_on' => 'end date',
        'impact_levels.*.amount' => 'level amount', 'impact_levels.*.text.ar' => 'Arabic level text', 'fund_type' => 'fund', 'paid_on' => 'payment date', 'campaign_id' => 'campaign',
        'approved_amount' => 'approved amount', 'task_date' => 'date', 'assigned_to' => 'volunteer', 'gold_price_per_gram' => 'gold price per gram', 'silver_price_per_gram' => 'silver price per gram',
    ],
];
