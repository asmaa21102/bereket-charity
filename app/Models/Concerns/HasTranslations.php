<?php

namespace App\Models\Concerns;

/**
 * JSON columns holding {ar, en, tr}. `t('title')` returns the current locale,
 * falling back to Arabic, then to any language that has text.
 */
trait HasTranslations
{
    public function t(string $field, ?string $locale = null): ?string
    {
        $value = $this->{$field};
        if (! is_array($value)) {
            return $value;
        }
        $locale ??= app()->getLocale();

        return $value[$locale] ?? $value['ar'] ?? (collect($value)->first(fn ($v) => filled($v)));
    }

    /** Keep Arabic and Turkish readable in the database (and searchable, and legible in phpMyAdmin). */
    protected function asJson($value, $flags = 0)
    {
        return json_encode($value, $flags | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
