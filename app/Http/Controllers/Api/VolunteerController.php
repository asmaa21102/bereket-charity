<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Volunteer;
use App\Models\VolunteerTask;
use App\Support\Charity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VolunteerController extends Controller
{
    public static function task(VolunteerTask $t): array
    {
        return [
            'id' => $t->id,
            'title' => $t->title,
            'description' => $t->description,
            'location' => $t->location,
            'date' => $t->task_date->toDateString(),
            'status' => $t->status,
            'campaign' => $t->campaign ? ['slug' => $t->campaign->slug, 'title' => $t->campaign->t('title')] : null,
            'assignee' => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
        ];
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $v = $user->volunteer;

        return response()->json([
            'application' => $v ? ['skills' => $v->skills, 'availability' => $v->availability, 'city' => $v->city, 'motivation' => $v->motivation, 'status' => $v->status] : null,
            'tasks' => VolunteerTask::with('campaign')->where('assigned_to', $user->id)->orderBy('task_date')->get()->map(fn ($t) => self::task($t)),
        ]);
    }

    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'skills' => ['required', 'array', 'min:1'],
            'skills.*' => [Rule::in(Charity::SKILLS)],
            'availability' => ['required', Rule::in(['weekdays', 'weekends', 'evenings', 'flexible'])],
            'city' => ['required', 'string', 'max:60'],
            'motivation' => ['nullable', 'string', 'max:1000'],
        ]);
        $v = Volunteer::updateOrCreate(['user_id' => $request->user()->id], $data + ['status' => 'pending']);
        AuditLog::record('volunteer.applied', $v);

        return response()->json(['ok' => true], 201);
    }

    public function completeTask(Request $request, VolunteerTask $task): JsonResponse
    {
        abort_unless($task->assigned_to === $request->user()->id, 404);
        $task->update(['status' => 'done']);
        AuditLog::record('task.done', $task);

        return response()->json(['ok' => true]);
    }
}
