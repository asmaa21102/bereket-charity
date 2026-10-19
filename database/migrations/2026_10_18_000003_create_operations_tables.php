<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Requests for help from people in need.
        Schema::create('aid_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // medical, education, financial, rent
            $table->string('title');
            $table->text('description'); // stored encrypted
            $table->decimal('amount_requested', 10, 2);
            $table->unsignedTinyInteger('family_size')->default(1);
            $table->string('city', 60);
            $table->text('phone')->nullable(); // encrypted
            $table->string('status', 20)->default('submitted'); // submitted, under_review, approved, rejected, disbursed
            $table->decimal('approved_amount', 10, 2)->nullable();
            $table->string('fund_type', 20)->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('decision_note')->nullable();
            $table->timestamps();
        });

        // Uploaded documents: the file content is encrypted (AES-256) before it touches the disk.
        Schema::create('aid_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aid_request_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20); // id, medical, income, other
            $table->string('original_name');
            $table->string('path');
            $table->string('mime', 80);
            $table->unsignedInteger('size');
            $table->timestamps();
        });

        Schema::create('aid_request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aid_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // Money going out (aid payments, purchases) — the other half of the financial report.
        Schema::create('disbursements', function (Blueprint $table) {
            $table->id();
            $table->string('fund_type', 20);
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('aid_request_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('description');
            $table->date('paid_on');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('volunteers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('skills');
            $table->string('availability', 20); // weekdays, weekends, evenings, flexible
            $table->string('city', 60);
            $table->text('motivation')->nullable();
            $table->string('status', 12)->default('pending'); // pending, approved, rejected
            $table->timestamps();
        });

        Schema::create('volunteer_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->date('task_date');
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 12)->default('open'); // open, assigned, done
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('user_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('badge', 30);
            $table->timestamps();
            $table->unique(['user_id', 'badge']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 60);
            $table->string('subject_type', 40)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('details')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index('created_at');
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['settings', 'audit_logs', 'user_badges', 'volunteer_tasks', 'volunteers', 'disbursements', 'aid_request_events', 'aid_documents', 'aid_requests'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
