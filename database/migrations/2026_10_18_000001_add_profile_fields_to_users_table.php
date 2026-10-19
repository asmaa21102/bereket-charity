<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            // user = donor / applicant, volunteer = approved volunteer, staff = reviews requests, admin = everything
            $table->string('role', 20)->default('user')->after('password');
            $table->string('locale', 2)->default('ar')->after('role');
            $table->text('two_factor_secret')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->boolean('is_suspended')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'role', 'locale', 'two_factor_secret', 'two_factor_confirmed_at', 'is_suspended']);
        });
    }
};
