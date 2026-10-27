# Evidence integrity on download

Evidence uploads calculate and store a SHA-256 digest. Before returning a stored evidence file, `GET /api/v1/evidence/{evidence_id}/download` recalculates the digest in bounded chunks and compares it with the stored digest. If the file has changed since upload, the endpoint returns HTTP 409 with `Evidence integrity check failed` rather than serving the modified bytes. The existing authorization and storage-root path checks still run before serving the file.

Regression coverage includes successful download with unchanged bytes, cross-region access denial, and rejection of a file modified after upload. This protects integrity at download time but does not replace object-store versioning, malware scanning, immutable retention, or external backups.