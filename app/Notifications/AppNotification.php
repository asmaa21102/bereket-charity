<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One notification class for the whole app: a template key + parameters. The text is
 * written in the reader's language when shown (front-end dictionary) or emailed.
 */
class AppNotification extends Notification
{
    use Queueable;

    public function __construct(public string $key, public array $params = [], public ?string $link = null, public bool $email = false) {}

    public function via(object $notifiable): array
    {
        return $this->email ? ['database', 'mail'] : ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['key' => $this->key, 'params' => $this->params, 'link' => $this->link];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $locale = $notifiable->locale ?? 'ar';

        return (new MailMessage)
            ->subject(__("notifications.{$this->key}.title", $this->params, $locale))
            ->line(__("notifications.{$this->key}.body", $this->params, $locale))
            ->action(__('notifications.open', [], $locale), url($this->link ?? '/'));
    }
}
