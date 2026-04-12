<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Equipment;
use App\Models\Setting;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin ──────────────────────────────────────────────
        User::create([
            'name'      => 'Administrator',
            'email'     => 'admin@agricoop.ph',
            'password'  => Hash::make('admin123'),
            'role'      => 'admin',
            'phone'     => '088-123-4567',
            'address'   => 'AgriCoop Office, Cagayan de Oro City',
            'is_active' => true,
        ]);

        // ── Farmers ────────────────────────────────────────────
        User::create([
            'name'      => 'Juan dela Cruz',
            'email'     => 'juan@farmer.com',
            'password'  => Hash::make('farmer123'),
            'role'      => 'farmer',
            'phone'     => '09171234567',
            'address'   => 'Brgy. Bagong Silang, Bukidnon',
            'is_active' => true,
        ]);
        User::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@farmer.com',
            'password'  => Hash::make('farmer123'),
            'role'      => 'farmer',
            'phone'     => '09181234567',
            'address'   => 'Brgy. Calaanan, Cagayan de Oro',
            'is_active' => true,
        ]);
        User::create([
            'name'      => 'Pedro Reyes',
            'email'     => 'pedro@farmer.com',
            'password'  => Hash::make('farmer123'),
            'role'      => 'farmer',
            'phone'     => '09191234567',
            'address'   => 'Brgy. Indahag, Cagayan de Oro',
            'is_active' => true,
        ]);

        // ── Drivers ────────────────────────────────────────────
        User::create([
            'name'      => 'Lito Aguilar',
            'email'     => 'lito@driver.com',
            'password'  => Hash::make('driver123'),
            'role'      => 'driver',
            'phone'     => '09201234567',
            'address'   => 'Cagayan de Oro City',
            'is_active' => true,
        ]);
        User::create([
            'name'      => 'Rodel Mendez',
            'email'     => 'rodel@driver.com',
            'password'  => Hash::make('driver123'),
            'role'      => 'driver',
            'phone'     => '09211234567',
            'address'   => 'Cagayan de Oro City',
            'is_active' => true,
        ]);

        // ── Equipment ──────────────────────────────────────────
        $equipment = [
            ['equipment_name' => 'Kubota Tractor L3408',  'category' => 'Tractor',     'rental_price' => 1500, 'status' => 'available',    'location' => 'Main Shed A',  'description' => '34HP 4WD tractor suitable for rice and corn fields'],
            ['equipment_name' => 'Heavy Disk Plow',        'category' => 'Plow',        'rental_price' => 500,  'status' => 'available',    'location' => 'Main Shed A',  'description' => 'Disc plow attachment for deep tillage'],
            ['equipment_name' => 'Yamato Rotavator',       'category' => 'Rotavator',   'rental_price' => 800,  'status' => 'available',    'location' => 'Main Shed B',  'description' => 'Soil tilling rotavator for seedbed preparation'],
            ['equipment_name' => 'Motorized Transplanter', 'category' => 'Transplanter','rental_price' => 1200, 'status' => 'maintenance',  'location' => 'Workshop',     'description' => '4-row rice transplanting machine'],
            ['equipment_name' => 'Backpack Sprayer',       'category' => 'Sprayer',     'rental_price' => 250,  'status' => 'available',    'location' => 'Storage Room', 'description' => 'Motorized knapsack sprayer 20L tank'],
            ['equipment_name' => 'Combine Harvester',      'category' => 'Harvester',   'rental_price' => 3500, 'status' => 'available',    'location' => 'Main Shed C',  'description' => 'Full-feed combine harvester for rice'],
            ['equipment_name' => 'Grain Dryer 500kg',      'category' => 'Grain Dryer', 'rental_price' => 900,  'status' => 'available',    'location' => 'Drying Area',  'description' => 'Gas-fired batch grain dryer'],
            ['equipment_name' => 'Farm Trailer 3T',        'category' => 'Trailer',     'rental_price' => 600,  'status' => 'available',    'location' => 'Main Shed A',  'description' => '3-ton capacity farm utility trailer'],
        ];

        foreach ($equipment as $e) Equipment::create($e);

        // ── Default Settings ───────────────────────────────────
        $settings = [
            'price_per_km'           => '25',
            'coop_name'              => 'AgriCoop Northern Mindanao',
            'coop_address'           => 'Cagayan de Oro City, Misamis Oriental',
            'contact_email'          => 'info@agricoop.ph',
            'contact_phone'          => '088-123-4567',
            'maintenance_alert_days' => '30',
        ];

        foreach ($settings as $key => $value) {
            Setting::set($key, $value);
        }
    }
}