<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\VolunteerController;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerTask;
use App\Notifications\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Users and roles, volunteers and their field tasks, the audit log and settings. */
class PeopleController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        $q = User::withCount(['donations as paid_count' => fn ($d) => $d->where('status', 'paid')])
            ->withSum(['donations as paid_sum' => fn ($d) => $d->where('status', 'paid')], 'amount')
            ->withCount('aidRequests')->latest();
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"));
        }
        if (in_array($request->query('role'), ['user', 'volunteer', 'staff', 'admin'], true)) {
            $q->where('role', $request->query('role'));
        }

        return response()->json(['users' => $q->limit(200)->get()->map(fn (User $u) => [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'role' => $u->role,
            'suspended' => $u->is_suspended, 'two_factor' => $u->hasTwoFactor(),
            'donations' => $u->paid_count, 'given' => (float) $u->paid_sum, 'aid_requests' => $u->aid_requests_count,
            'created_at' => $u->created_at->toIso8601String(),
        ])]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, __('api.status_not_allowed'));
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(['user', 'volunteer', 'staff', 'admin'])],
            'is_suspended' => ['sometimes', 'boolean'],
        ]);
        $before = $user->only(['role', 'is_suspended']);
        $user->forceFill($data)->save();
        AuditLog::record('user.updated', $user, ['before' => $before, 'after' => $data]);

        return response()->json(['ok' => true]);
    }

    public function volunteers(): JsonResponse
    {
        return response()->json([
            'volunteers' => Volunteer::with('user:id,name,email,phone')->latest()->get()->map(fn (Volunteer $v) => [
                'id' => $v->id, 'user_id' => $v->user_id, 'name' => $v->user->name, 'email' => $v->user->email, 'phone' => $v->user->phone,
                'skills' => $v->skills, 'availability' => $v->availability, 'city' => $v->city, 'motivation' => $v->motivation, 'status' => $v->status,
                'tasks_done' => VolunteerTask::where('assigned_to', $v->user_id)->where('status', 'done')->count(),
            ]),
            'tasks' => VolunteerTask::with(['assignee', 'campaign'])->latest('task_date')->get()->map(fn ($t) => VolunteerController::task($t)),
        ]);
    }

    public function reviewVolunteer(Request $request, Volunteer $volunteer): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])]]);
        $volunteer->update($data);
        if ($data['status'] === 'approved' && $volunteer->user->role === 'user') {
            $volunteer->user->forceFill(['role' => 'volunteer'])->save();
        }
        $volunteer->user->notify(new AppNotification('volunteer_status', ['status' => $data['status']], '/volunteer'));
        AuditLog::record('volunteer.'.$data['status'], $volunteer);

        return response()->json(['ok' => true]);
    }

    public function saveTask(Request $request, ?VolunteerTask $task = null): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:160'],
            'task_date' => ['required', 'date'],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'assigned_to' => ['nullable', Rule::exists('volunteers', 'user_id')->where('status', 'approved')],
        ]);
        $assignedBefore = $task?->assigned_to;
        $data['status'] = $data['assigned_to'] ? ($task?->status === 'done' ? 'done' : 'assigned') : 'open';
        $task = $task ? tap($task)->update($data) : VolunteerTask::create($data + ['created_by' => $request->user()->id]);
        if ($task->assigned_to && $task->assigned_to !== $assignedBefore) {
            $task->assignee->notify(new AppNotification('task_assigned', ['title' => $task->title, 'date' => $task->task_date->toDateString()], '/volunteer'));
        }
        AuditLog::record('task.saved', $task, ['assigned_to' => $task->assigned_to]);

        return response()->json(['id' => $task->id]);
    }

    public function audit(Request $request): JsonResponse
    {
        $q = \App\Models\AuditLog::with('user:id,name')->latest();
        if ($a = $request->query('action')) {
            $q->where('action', 'like', $a.'%');
        }
        $page = $q->paginate(50);

        return response()->json(['data' => collect($page->items())->map(fn ($l) => [
            'id' => $l->id, 'action' => $l->action, 'user' => $l->user?->name, 'subject' => $l->subject_type ? $l->subject_type.' #'.$l->subject_id : null,
            'details' => $l->details, 'ip' => $l->ip, 'at' => $l->created_at->toIso8601String(),
        ]), 'page' => $page->currentPage(), 'pages' => $page->lastPage()]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['gold_price_per_gram' => (float) Setting::get('gold_price_per_gram', 3100), 'silver_price_per_gram' => (float) Setting::get('silver_price_per_gram', 38)]);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['gold_price_per_gram' => ['required', 'numeric', 'between:1,1000000'], 'silver_price_per_gram' => ['required', 'numeric', 'between:0.1,100000']]);
        foreach ($data as $k => $v) {
            Setting::put($k, (float) $v);
        }
        AuditLog::record('settings.updated', null, $data);

        return response()->json(['ok' => true]);
    }
}
