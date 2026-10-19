<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['total' => 'decimal:2'];

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }
}
