<?php

namespace Database\Seeders;

use App\Models\AidRequest;
use App\Models\Campaign;
use App\Models\Disbursement;
use App\Models\Donation;
use App\Models\Order;
use App\Models\RecurringDonation;
use App\Models\Setting;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerTask;
use App\Notifications\AppNotification;
use App\Services\AidDocuments;
use App\Services\Badges;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Demo data for the portfolio: a fictional charity ("Bereket") with fictional people.
 * Every payment is simulated. php artisan migrate:fresh --seed
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(42);
        Setting::put('gold_price_per_gram', 3100);
        Setting::put('silver_price_per_gram', 38);

        $admin = User::create(['name' => 'Bereket Admin', 'email' => 'admin@bereket.test', 'password' => 'Admin12345', 'locale' => 'ar'])->forceFill(['role' => 'admin', 'email_verified_at' => now()]);
        $admin->save();
        $staff = User::create(['name' => 'Zeynep Arslan', 'email' => 'staff@bereket.test', 'password' => 'Staff12345', 'locale' => 'tr'])->forceFill(['role' => 'staff', 'email_verified_at' => now()]);
        $staff->save();
        $demo = User::create(['name' => 'Demo Donor', 'email' => 'donor@bereket.test', 'password' => 'Donor12345', 'phone' => '+90 555 000 00 01', 'locale' => 'ar']);
        $needy = User::create(['name' => 'Fatma Yıldız', 'email' => 'aid@bereket.test', 'password' => 'Aid12345', 'phone' => '+90 555 000 00 02', 'locale' => 'tr']);
        $vol = User::create(['name' => 'Omar Khalil', 'email' => 'volunteer@bereket.test', 'password' => 'Volunteer12345', 'phone' => '+90 555 000 00 03', 'locale' => 'ar']);
        $donors = collect([['Ahmet Demir', 'tr'], ['Layla Hassan', 'ar'], ['Mehmet Öz', 'tr'], ['Sara Ali', 'ar'], ['John Miller', 'en'], ['Elif Kaya', 'tr'], ['Yusuf Amin', 'ar'], ['Hana Saleh', 'ar']])
            ->map(fn ($p, $i) => User::create(['name' => $p[0], 'email' => 'donor'.($i + 1).'@example.com', 'password' => Str::random(20), 'locale' => $p[1]]))
            ->push($demo);

        // "fill" = how much of the goal the demo donations reach
        $fills = [];
        $campaigns = collect($this->campaigns())->map(function ($c, $i) use (&$fills) {
            $fills[$c['slug']] = $c['fill'];
            unset($c['fill']);

            return Campaign::create($c + ['sort_order' => $i + 1, 'status' => 'active']);
        });

        // Donations over the last 60 days, paid through simulated checkouts.
        $methods = ['card', 'card', 'card', 'apple_pay', 'google_pay'];
        $brands = ['Visa', 'Mastercard', 'Troy'];
        foreach ($campaigns as $c) {
            $target = (float) $c->goal_amount * $fills[$c->slug];
            $sum = 0;
            while ($sum < $target) {
                $user = mt_rand(0, 4) ? $donors->random() : null;
                $amount = collect([100, 150, 250, 250, 500, 500, 750, 1000, 1500, 2500])->random();
                $at = now()->subDays(mt_rand(0, 59))->subMinutes(mt_rand(0, 1400));
                $method = $methods[array_rand($methods)];
                $order = Order::create(['user_id' => $user?->id, 'total' => $amount, 'status' => 'paid', 'payment_method' => $method, 'payment_ref' => 'pay_test_'.Str::lower(Str::random(16)), 'access_token' => Str::random(40), 'created_at' => $at, 'updated_at' => $at]);
                $d = Donation::create([
                    'order_id' => $order->id, 'user_id' => $user?->id, 'campaign_id' => $c->id,
                    'fund_type' => $c->fund_types[array_rand($c->fund_types)], 'amount' => $amount, 'status' => 'paid', 'paid_at' => $at,
                    'payment_method' => $method, 'card_brand' => $method === 'card' ? $brands[array_rand($brands)] : ($method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'),
                    'card_last4' => $method === 'card' ? (string) mt_rand(1000, 9999) : null,
                    'donor_name' => $user?->name ?? collect(['Ali Rıza', 'Nour', 'Kerem Aydın', 'Mariam', 'Can Yılmaz'])->random(),
                    'donor_email' => $user?->email ?? 'guest'.mt_rand(1, 999).'@example.com',
                    'is_anonymous' => mt_rand(0, 6) === 0, 'created_at' => $at, 'updated_at' => $at,
                ]);
                $d->assignReceiptNumber();
                $sum += $amount;
            }
            $c->refreshTotals();
        }

        // The demo donor: a gift donation, a zakat payment and a monthly plan.
        $food = $campaigns->firstWhere('slug', 'ramadan-food-baskets');
        $orphans = $campaigns->firstWhere('slug', 'orphan-sponsorship');
        $gift = Donation::create(['user_id' => $demo->id, 'campaign_id' => $campaigns->firstWhere('slug', 'clean-water-wells')->id, 'fund_type' => 'jariyah', 'amount' => 1500, 'status' => 'paid', 'paid_at' => now()->subDays(12), 'payment_method' => 'card', 'card_brand' => 'Visa', 'card_last4' => '4242', 'donor_name' => $demo->name, 'donor_email' => $demo->email, 'gift_name' => 'أمي', 'gift_relation' => 'parent', 'gift_message' => 'صدقة جارية عن أمي الغالية، أطال الله في عمرها.', 'gift_token' => Str::random(32)]);
        $gift->assignReceiptNumber();
        Donation::create(['user_id' => $demo->id, 'fund_type' => 'zakat', 'amount' => 2400, 'status' => 'paid', 'paid_at' => now()->subDays(20), 'payment_method' => 'apple_pay', 'card_brand' => 'Apple Pay', 'donor_name' => $demo->name, 'donor_email' => $demo->email])->assignReceiptNumber();
        $plan = RecurringDonation::create(['user_id' => $demo->id, 'campaign_id' => $orphans->id, 'fund_type' => 'sadaqah', 'amount' => 500, 'frequency' => 'monthly', 'next_charge_on' => today()->addDays(9), 'card_brand' => 'Visa', 'card_last4' => '4242', 'charges_count' => 3]);
        foreach ([3, 2, 1] as $m) {
            Donation::create(['user_id' => $demo->id, 'campaign_id' => $orphans->id, 'recurring_donation_id' => $plan->id, 'fund_type' => 'sadaqah', 'amount' => 500, 'status' => 'paid', 'paid_at' => now()->subMonths($m)->addDays(9), 'payment_method' => 'card', 'card_brand' => 'Visa', 'card_last4' => '4242', 'donor_name' => $demo->name, 'donor_email' => $demo->email])->assignReceiptNumber();
        }
        Donation::create(['user_id' => $demo->id, 'campaign_id' => $food->id, 'fund_type' => 'sadaqah', 'amount' => 750, 'status' => 'paid', 'paid_at' => now()->subDays(25), 'payment_method' => 'card', 'card_brand' => 'Mastercard', 'card_last4' => '5100', 'donor_name' => $demo->name, 'donor_email' => $demo->email])->assignReceiptNumber();
        foreach ($campaigns as $c) {
            $c->refreshTotals();
        }
        foreach ($donors as $u) {
            (new Badges)->evaluate($u);
        }

        // Field updates: what happened with the money.
        $this->updates($campaigns, $admin);

        // Money out: purchases and aid payments, per fund.
        foreach ([['sadaqah', $food, 18000, 'شراء 24 سلة غذائية من مورد محلي'], ['jariyah', $campaigns->firstWhere('slug', 'clean-water-wells'), 42000, 'حفر البئر الأولى وتركيب المضخة'], ['zakat', null, 6500, 'إيجار ثلاثة أشهر لعائلة مستحقة'], ['sadaqah', $campaigns->firstWhere('slug', 'winter-warmth'), 9600, 'شراء 80 بطانية شتوية'], ['general', null, 3200, 'نقل وتوزيع المساعدات']] as $i => [$fund, $c, $amount, $desc]) {
            Disbursement::create(['fund_type' => $fund, 'campaign_id' => $c?->id, 'amount' => $amount, 'description' => $desc, 'paid_on' => today()->subDays(30 - $i * 6), 'created_by' => $admin->id]);
        }

        // Aid requests with (encrypted) sample documents.
        $docs = app(AidDocuments::class);
        $sample = fn ($name) => UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n% Bereket demo document — fictional\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF");
        foreach ([
            [$needy, 'medical', 'عملية جراحية لابنتي', 'ابنتي تحتاج إلى عملية في الركبة، وتكلفتها أكبر من دخلنا الشهري. مرفق التقرير الطبي وعرض السعر من المستشفى.', 18000, 4, 'Karabük', 'under_review'],
            [$needy, 'rent', 'مساعدة في الإيجار', 'زوجي فقد عمله منذ شهرين ولم نتمكن من دفع الإيجار. نحتاج مساعدة لثلاثة أشهر حتى يجد عملًا.', 7500, 4, 'Karabük', 'disbursed'],
            [$donors[2], 'education', 'Üniversite kayıt ücreti', 'Kızım üniversiteyi kazandı ama kayıt ve kitap masraflarını karşılayamıyoruz. Gelir belgemizi ekledim.', 5200, 3, 'Safranbolu', 'submitted'],
        ] as [$u, $type, $title, $desc, $amount, $family, $city, $status]) {
            $r = AidRequest::create(['reference' => 'TMP'.uniqid(), 'user_id' => $u->id, 'type' => $type, 'title' => $title, 'description' => $desc, 'amount_requested' => $amount, 'family_size' => $family, 'city' => $city, 'phone' => '+90 555 000 00 0'.mt_rand(2, 9), 'status' => 'submitted']);
            $r->update(['reference' => sprintf('AID-%s-%04d', now()->format('Y'), $r->id)]);
            $docs->store($r, $sample('id-card.pdf'), 'id');
            $docs->store($r, $sample($type === 'medical' ? 'medical-report.pdf' : 'income-proof.pdf'), $type === 'medical' ? 'medical' : 'income');
            $r->events()->create(['actor_id' => $u->id, 'to_status' => 'submitted', 'created_at' => now()->subDays(10)]);
            if (in_array($status, ['under_review', 'disbursed'], true)) {
                $r->events()->create(['actor_id' => $staff->id, 'from_status' => 'submitted', 'to_status' => 'under_review', 'created_at' => now()->subDays(8)]);
                $r->update(['status' => 'under_review', 'reviewer_id' => $staff->id]);
            }
            if ($status === 'disbursed') {
                $r->events()->create(['actor_id' => $staff->id, 'from_status' => 'under_review', 'to_status' => 'approved', 'note' => 'تم التحقق من عقد الإيجار والوضع المادي بزيارة ميدانية.', 'created_at' => now()->subDays(6)]);
                $r->events()->create(['actor_id' => $admin->id, 'from_status' => 'approved', 'to_status' => 'disbursed', 'created_at' => now()->subDays(5)]);
                $r->update(['status' => 'disbursed', 'approved_amount' => 6500, 'fund_type' => 'zakat', 'decision_note' => 'تم التحقق من عقد الإيجار والوضع المادي بزيارة ميدانية.']);
                Disbursement::where('description', 'إيجار ثلاثة أشهر لعائلة مستحقة')->update(['aid_request_id' => $r->id]);
            }
        }

        // Volunteers and tasks.
        Volunteer::create(['user_id' => $vol->id, 'skills' => ['logistics', 'driving', 'translation'], 'availability' => 'weekends', 'city' => 'Karabük', 'motivation' => 'أحب أن أساعد في توزيع السلال في رمضان.', 'status' => 'approved']);
        $vol->forceFill(['role' => 'volunteer'])->save();
        Volunteer::create(['user_id' => $donors[0]->id, 'skills' => ['media', 'it'], 'availability' => 'evenings', 'city' => 'Ankara', 'motivation' => 'Sosyal medya paylaşımlarında yardımcı olabilirim.', 'status' => 'pending']);
        VolunteerTask::create(['title' => 'توزيع السلال الغذائية — حي 100. Yıl', 'description' => 'تحميل 20 سلة من المستودع وتوزيعها حسب القائمة.', 'location' => 'Karabük depo', 'task_date' => today()->addDays(3), 'campaign_id' => $food->id, 'assigned_to' => $vol->id, 'status' => 'assigned', 'created_by' => $admin->id]);
        VolunteerTask::create(['title' => 'تصوير تسليم البطانيات', 'location' => 'Safranbolu', 'task_date' => today()->subDays(4), 'campaign_id' => $campaigns->firstWhere('slug', 'winter-warmth')->id, 'assigned_to' => $vol->id, 'status' => 'done', 'created_by' => $admin->id]);
        VolunteerTask::create(['title' => 'ترتيب المستودع قبل الشتاء', 'location' => 'Karabük depo', 'task_date' => today()->addDays(8), 'status' => 'open', 'created_by' => $admin->id]);

        $demo->notify(new AppNotification('campaign_update', ['campaign' => $food->t('title', 'ar'), 'title' => 'تم تسليم 24 سلة غذائية'], '/campaigns/'.$food->slug));
        $demo->notify(new AppNotification('recurring_charged', ['amount' => 500, 'receipt' => $plan->donations()->latest('paid_at')->first()->receipt_no], '/wallet'));
        $needy->notify(new AppNotification('aid_status', ['reference' => AidRequest::where('type', 'rent')->value('reference'), 'status' => 'disbursed'], '/aid'));
        $vol->notify(new AppNotification('task_assigned', ['title' => 'توزيع السلال الغذائية', 'date' => today()->addDays(3)->toDateString()], '/volunteer'));
    }

    private function updates($campaigns, User $admin): void
    {
        $u = fn ($slug, $stage, $days, $title, $body = null) => $campaigns->firstWhere('slug', $slug)->updates()->create([
            'stage' => $stage, 'title' => $title, 'body' => $body, 'created_by' => $admin->id, 'published_at' => now()->subDays($days),
        ]);
        $u('ramadan-food-baskets', 'purchased', 18, ['ar' => 'اشترينا 24 سلة غذائية', 'en' => 'We bought 24 food baskets', 'tr' => '24 gıda kolisi satın aldık'], ['ar' => 'من مورد محلي بسعر الجملة، وكل سلة تكفي عائلة من 5 أفراد لأسبوعين.', 'en' => 'From a local supplier at wholesale price; each basket feeds a family of five for two weeks.', 'tr' => 'Yerel bir tedarikçiden toptan fiyatına; her koli beş kişilik bir aileyi iki hafta besliyor.']);
        $u('ramadan-food-baskets', 'delivered', 15, ['ar' => 'تم تسليم 24 سلة غذائية', 'en' => '24 food baskets delivered', 'tr' => '24 gıda kolisi teslim edildi'], ['ar' => 'وزّعها متطوعونا على العائلات في حي 100. Yıl.', 'en' => 'Our volunteers delivered them to families in the 100. Yıl neighbourhood.', 'tr' => 'Gönüllülerimiz 100. Yıl mahallesindeki ailelere dağıttı.']);
        $u('clean-water-wells', 'purchased', 22, ['ar' => 'بدأ حفر البئر الأولى', 'en' => 'Drilling of the first well has started', 'tr' => 'İlk kuyunun açılmasına başlandı']);
        $u('clean-water-wells', 'delivered', 9, ['ar' => 'البئر الأولى تعمل الآن', 'en' => 'The first well is now working', 'tr' => 'İlk kuyu artık çalışıyor'], ['ar' => 'تخدم 300 شخص يوميًا بمياه نظيفة.', 'en' => 'It serves 300 people a day with clean water.', 'tr' => 'Günde 300 kişiye temiz su sağlıyor.']);
        $u('winter-warmth', 'delivered', 6, ['ar' => 'وصلت 80 بطانية إلى سفرانبولو', 'en' => '80 blankets reached Safranbolu', 'tr' => '80 battaniye Safranbolu’ya ulaştı']);
        $u('orphan-sponsorship', 'update', 4, ['ar' => 'كفالات جديدة لـ 6 أطفال', 'en' => 'New sponsorships for 6 children', 'tr' => '6 çocuk için yeni sponsorluk'], ['ar' => 'بدأت الكفالات الشهرية التي تغطي التعليم والغذاء.', 'en' => 'Monthly sponsorships covering school and food have begun.', 'tr' => 'Okul ve gıdayı karşılayan aylık sponsorluklar başladı.']);
        $u('earthquake-emergency', 'received', 2, ['ar' => 'استلمنا تبرعات الطوارئ الأولى', 'en' => 'First emergency donations received', 'tr' => 'İlk acil durum bağışları alındı']);
    }

    private function campaigns(): array
    {
        $list = [
            ['slug' => 'ramadan-food-baskets', 'category' => 'food', 'goal_amount' => 120000, 'unit_price' => 750, 'is_urgent' => false, 'fill' => 0.68,
                'title' => ['ar' => 'سلال رمضان الغذائية', 'en' => 'Ramadan food baskets', 'tr' => 'Ramazan gıda kolileri'],
                'summary' => ['ar' => 'سلة تكفي عائلة من 5 أفراد لأسبوعين: أرز، طحين، زيت، عدس وتمر.', 'en' => 'A basket feeds a family of five for two weeks: rice, flour, oil, lentils and dates.', 'tr' => 'Bir koli beş kişilik bir aileyi iki hafta besler: pirinç, un, yağ, mercimek ve hurma.'],
                'story' => ['ar' => "مع ارتفاع الأسعار، أصبحت مئات العائلات في كارابوك غير قادرة على تأمين طعام الشهر.\n\nنشتري السلال من موردين محليين بسعر الجملة، ويوزعها متطوعونا مباشرة على العائلات التي تم التحقق من حاجتها.", 'en' => "With rising prices, hundreds of families in Karabük can no longer afford a month of food.\n\nWe buy the baskets from local suppliers at wholesale price, and our volunteers hand them directly to verified families.", 'tr' => "Artan fiyatlarla Karabük’te yüzlerce aile bir aylık yiyeceği karşılayamıyor.\n\nKolileri yerel tedarikçilerden toptan fiyatına alıyoruz ve gönüllülerimiz ihtiyacı doğrulanmış ailelere doğrudan teslim ediyor."],
                'unit_label' => ['ar' => 'سلة غذائية', 'en' => 'food basket', 'tr' => 'gıda kolisi'],
                'fund_types' => ['sadaqah', 'zakat', 'general', 'kaffarah'],
                'impact_levels' => [['amount' => 250, 'text' => ['ar' => 'يوفر وجبات إفطار لعائلة لأسبوع', 'en' => 'Iftar meals for a family for a week', 'tr' => 'Bir aileye bir haftalık iftar']], ['amount' => 750, 'text' => ['ar' => 'سلة غذائية كاملة لعائلة من 5 أفراد', 'en' => 'A full basket for a family of five', 'tr' => 'Beş kişilik bir aileye tam koli']], ['amount' => 3000, 'text' => ['ar' => 'يطعم 4 عائلات لأسبوعين', 'en' => 'Feeds 4 families for two weeks', 'tr' => '4 aileyi iki hafta besler']]]],
            ['slug' => 'orphan-sponsorship', 'category' => 'orphans', 'goal_amount' => 90000, 'unit_price' => 1500, 'is_urgent' => false, 'fill' => 0.52,
                'title' => ['ar' => 'كفالة يتيم', 'en' => 'Sponsor an orphan', 'tr' => 'Yetim sponsorluğu'],
                'summary' => ['ar' => 'كفالة شهرية تغطي تعليم الطفل وغذاءه ورعايته الصحية.', 'en' => 'A monthly sponsorship covering a child’s school, food and health care.', 'tr' => 'Bir çocuğun okulunu, beslenmesini ve sağlığını karşılayan aylık sponsorluk.'],
                'story' => ['ar' => 'نتابع كل طفل مكفول مع أسرته شهريًا، ونرسل للكافل تقريرًا عن تقدمه الدراسي.', 'en' => 'We follow every sponsored child with their family each month and send the sponsor a report on their schooling.', 'tr' => 'Sponsor olunan her çocuğu ailesiyle her ay takip ediyor ve sponsora okul durumu hakkında rapor gönderiyoruz.'],
                'unit_label' => ['ar' => 'شهر كفالة', 'en' => 'month of sponsorship', 'tr' => 'aylık sponsorluk'],
                'fund_types' => ['sadaqah', 'zakat', 'general'],
                'impact_levels' => [['amount' => 500, 'text' => ['ar' => 'يغطي المستلزمات المدرسية لطالب', 'en' => 'Covers school supplies for a pupil', 'tr' => 'Bir öğrencinin okul malzemesini karşılar']], ['amount' => 1500, 'text' => ['ar' => 'كفالة يتيم لشهر كامل', 'en' => 'Sponsors an orphan for a full month', 'tr' => 'Bir yetime bir ay sponsorluk']], ['amount' => 18000, 'text' => ['ar' => 'كفالة يتيم لسنة كاملة', 'en' => 'Sponsors an orphan for a whole year', 'tr' => 'Bir yetime bir yıl sponsorluk']]]],
            ['slug' => 'clean-water-wells', 'category' => 'water', 'goal_amount' => 150000, 'unit_price' => 50000, 'is_urgent' => false, 'fill' => 0.61,
                'title' => ['ar' => 'آبار مياه نظيفة', 'en' => 'Clean water wells', 'tr' => 'Temiz su kuyuları'],
                'summary' => ['ar' => 'صدقة جارية: بئر واحدة تروي 300 شخص يوميًا لسنوات طويلة.', 'en' => 'Ongoing charity: one well gives 300 people water every day for years.', 'tr' => 'Sadaka-i cariye: bir kuyu yıllarca her gün 300 kişiye su verir.'],
                'unit_label' => ['ar' => 'بئر', 'en' => 'well', 'tr' => 'kuyu'], 'fund_types' => ['jariyah', 'sadaqah', 'general'],
                'impact_levels' => [['amount' => 500, 'text' => ['ar' => 'يوفر مياهًا نظيفة لعائلة لسنة', 'en' => 'Clean water for a family for a year', 'tr' => 'Bir aileye bir yıl temiz su']], ['amount' => 5000, 'text' => ['ar' => 'يمول عُشر بئر كاملة', 'en' => 'Funds a tenth of a well', 'tr' => 'Bir kuyunun onda birini karşılar']]]],
            ['slug' => 'winter-warmth', 'category' => 'winter', 'goal_amount' => 60000, 'unit_price' => 600, 'is_urgent' => true, 'fill' => 0.44,
                'title' => ['ar' => 'دفء الشتاء', 'en' => 'Winter warmth', 'tr' => 'Kış sıcaklığı'],
                'summary' => ['ar' => 'بطانيات ومعاطف ووقود تدفئة للعائلات قبل أن يشتد البرد.', 'en' => 'Blankets, coats and heating fuel for families before the cold sets in.', 'tr' => 'Soğuk bastırmadan ailelere battaniye, mont ve yakacak.'],
                'unit_label' => ['ar' => 'حزمة شتوية', 'en' => 'winter kit', 'tr' => 'kış paketi'], 'fund_types' => ['sadaqah', 'zakat', 'general'],
                'impact_levels' => [['amount' => 150, 'text' => ['ar' => 'بطانية دافئة لطفل', 'en' => 'A warm blanket for a child', 'tr' => 'Bir çocuğa sıcak battaniye']], ['amount' => 600, 'text' => ['ar' => 'حزمة شتوية كاملة لعائلة', 'en' => 'A full winter kit for a family', 'tr' => 'Bir aileye tam kış paketi']]]],
            ['slug' => 'earthquake-emergency', 'category' => 'emergency', 'goal_amount' => 250000, 'unit_price' => null, 'is_urgent' => true, 'fill' => 0.27,
                'title' => ['ar' => 'طوارئ الزلزال', 'en' => 'Earthquake emergency', 'tr' => 'Deprem acil yardım'],
                'summary' => ['ar' => 'خيام ومياه وطعام وأدوية للعائلات المتضررة في الساعات الأولى.', 'en' => 'Tents, water, food and medicine for affected families in the first hours.', 'tr' => 'Etkilenen ailelere ilk saatlerde çadır, su, gıda ve ilaç.'],
                'fund_types' => ['sadaqah', 'zakat', 'general'], 'impact_levels' => [['amount' => 1000, 'text' => ['ar' => 'خيمة مؤقتة لعائلة', 'en' => 'A temporary tent for a family', 'tr' => 'Bir aileye geçici çadır']]]],
            ['slug' => 'patient-treatment', 'category' => 'health', 'goal_amount' => 80000, 'unit_price' => null, 'is_urgent' => false, 'fill' => 0.35,
                'title' => ['ar' => 'علاج المرضى', 'en' => 'Treatment for patients', 'tr' => 'Hasta tedavisi'],
                'summary' => ['ar' => 'عمليات جراحية وأدوية مزمنة لمرضى لا يستطيعون تحمل التكلفة.', 'en' => 'Surgery and long-term medicine for patients who cannot afford them.', 'tr' => 'Masrafı karşılayamayan hastalar için ameliyat ve sürekli ilaç.'],
                'fund_types' => ['zakat', 'sadaqah', 'general'], 'impact_levels' => [['amount' => 400, 'text' => ['ar' => 'دواء شهر لمريض سكري', 'en' => 'A month of medicine for a diabetic patient', 'tr' => 'Bir diyabet hastasına bir aylık ilaç']]]],
            ['slug' => 'student-support', 'category' => 'education', 'goal_amount' => 40000, 'unit_price' => 1200, 'is_urgent' => false, 'fill' => 0.71,
                'title' => ['ar' => 'دعم الطلاب', 'en' => 'Support students', 'tr' => 'Öğrencilere destek'],
                'summary' => ['ar' => 'حقيبة مدرسية وكتب ورسوم تسجيل لطلاب من عائلات محتاجة.', 'en' => 'School bags, books and fees for pupils from families in need.', 'tr' => 'İhtiyaç sahibi ailelerin çocuklarına çanta, kitap ve kayıt ücreti.'],
                'unit_label' => ['ar' => 'حقيبة مدرسية', 'en' => 'school kit', 'tr' => 'okul seti'], 'fund_types' => ['sadaqah', 'zakat', 'general'],
                'impact_levels' => [['amount' => 300, 'text' => ['ar' => 'دفاتر وأقلام لفصل دراسي', 'en' => 'Notebooks and pens for a term', 'tr' => 'Bir dönemlik defter ve kalem']], ['amount' => 1200, 'text' => ['ar' => 'حقيبة مدرسية كاملة مع الكتب', 'en' => 'A complete school kit with books', 'tr' => 'Kitaplarıyla tam okul seti']]]],
            ['slug' => 'family-housing', 'category' => 'housing', 'goal_amount' => 200000, 'unit_price' => null, 'is_urgent' => false, 'fill' => 1.02,
                'title' => ['ar' => 'ترميم بيوت العائلات', 'en' => 'Repairing family homes', 'tr' => 'Aile evlerinin onarımı'],
                'summary' => ['ar' => 'ترميم أسقف ونوافذ بيوت قديمة قبل الشتاء. اكتملت الحملة — شكرًا لكم!', 'en' => 'Fixing roofs and windows of old homes before winter. Goal reached — thank you!', 'tr' => 'Kıştan önce eski evlerin çatı ve pencerelerinin onarımı. Hedefe ulaşıldı — teşekkürler!'],
                'fund_types' => ['sadaqah', 'jariyah', 'general'], 'impact_levels' => []],
        ];

        return $list;
    }
}
