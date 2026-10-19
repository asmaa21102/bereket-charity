<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Texts are JSON {ar, en, tr}.
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('category', 30);
            $table->json('title');
            $table->json('summary');
            $table->json('story')->nullable();
            $table->string('cover')->nullable();
            $table->decimal('goal_amount', 12, 2);
            $table->decimal('raised_amount', 12, 2)->default(0);
            $table->unsignedInteger('donors_count')->default(0);
            // what one unit costs and what it is, e.g. 750 TRY = one food basket
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->json('unit_label')->nullable();
            $table->json('fund_types');
            $table->json('impact_levels')->nullable(); // [{amount, text:{ar,en,tr}}] for the amount slider
            $table->boolean('is_urgent')->default(false);
            $table->string('status', 20)->default('active'); // draft, active, completed, closed
            $table->date('ends_on')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Field updates shown on the campaign and as "where your money went" for its donors.
        Schema::create('campaign_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 20); // received, purchased, delivered, update
            $table->json('title');
            $table->json('body')->nullable();
            $table->string('image')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('recurring_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('fund_type', 20);
            $table->decimal('amount', 10, 2);
            $table->string('frequency', 10); // weekly, monthly
            $table->string('status', 12)->default('active'); // active, paused, cancelled
            $table->date('next_charge_on');
            $table->string('card_brand', 20)->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->unsignedInteger('charges_count')->default(0);
            $table->timestamps();
        });

        // One checkout (a cart can hold several donations).
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('total', 12, 2);
            $table->string('status', 12)->default('pending'); // pending, paid, failed
            $table->string('payment_method', 20)->nullable();
            $table->string('payment_ref', 40)->nullable();
            $table->string('failure_reason')->nullable();
            // lets a guest open their receipts without an account
            $table->string('access_token', 40)->unique();
            $table->timestamps();
        });

        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_no', 20)->nullable()->unique();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recurring_donation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('fund_type', 20); // zakat, sadaqah, jariyah, kaffarah, general
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('TRY');
            $table->string('status', 12)->default('pending'); // pending, paid, failed, refunded
            $table->string('payment_method', 20)->nullable(); // card, apple_pay, google_pay
            // Only the brand and last 4 digits are kept — never the card number (PCI-DSS).
            $table->string('card_brand', 20)->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->string('donor_name')->nullable();
            $table->string('donor_email')->nullable();
            $table->boolean('is_anonymous')->default(false);
            // Gift: donating on behalf of someone
            $table->string('gift_name')->nullable();
            $table->string('gift_relation', 20)->nullable(); // parent, friend, deceased, other
            $table->string('gift_message', 300)->nullable();
            $table->string('gift_token', 40)->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('recurring_donations');
        Schema::dropIfExists('campaign_updates');
        Schema::dropIfExists('campaigns');
    }
};
