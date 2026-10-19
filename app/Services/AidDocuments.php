<?php

namespace App\Services;

use App\Models\AidDocument;
use App\Models\AidRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Identity papers and medical reports are encrypted (AES-256 with the app key) before
 * they are written to private storage; they are only decrypted when an authorised
 * person opens them.
 */
class AidDocuments
{
    public function store(AidRequest $request, UploadedFile $file, string $kind): AidDocument
    {
        $path = 'aid/'.$request->id.'/'.Str::random(32).'.enc';
        Storage::disk('local')->put($path, Crypt::encryptString(base64_encode($file->get())));

        return $request->documents()->create([
            'kind' => $kind,
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
            'path' => $path,
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    public function contents(AidDocument $doc): string
    {
        return base64_decode(Crypt::decryptString(Storage::disk('local')->get($doc->path)));
    }

    public function deleteAll(AidRequest $request): void
    {
        Storage::disk('local')->deleteDirectory('aid/'.$request->id);
    }
}
