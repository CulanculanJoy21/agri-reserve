<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if (!Schema::hasColumn('reservations', 'delivery_address'))
                $table->text('delivery_address')->nullable()->after('notes');
            if (!Schema::hasColumn('reservations', 'latitude'))
                $table->decimal('latitude', 10, 8)->nullable()->after('delivery_address');
            if (!Schema::hasColumn('reservations', 'longitude'))
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'delivery_address'))
                $table->text('delivery_address')->nullable()->after('delivery_date');
            if (!Schema::hasColumn('deliveries', 'latitude'))
                $table->decimal('latitude', 10, 8)->nullable()->after('delivery_address');
            if (!Schema::hasColumn('deliveries', 'longitude'))
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['delivery_address', 'latitude', 'longitude']);
        });
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['delivery_address', 'latitude', 'longitude']);
        });
    }
};