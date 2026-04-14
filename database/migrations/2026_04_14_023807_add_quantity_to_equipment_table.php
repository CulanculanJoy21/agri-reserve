<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('returned_at')->nullable()->after('delivery_address');
            $table->integer('total_days')->nullable()->after('returned_at');
            $table->decimal('total_rental_cost', 10, 2)->nullable()->after('total_days');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['returned_at', 'total_days', 'total_rental_cost']);
        });
    }
};