<?php

return [
    // "required": staff/admins must turn on two-factor authentication before using the admin API.
    // "optional": they are reminded but not blocked (used for the public portfolio demo).
    'admin_2fa' => env('CHARITY_ADMIN_2FA', 'required'),
    'currency' => 'TRY',
    'demo' => (bool) env('CHARITY_DEMO', true),
];
