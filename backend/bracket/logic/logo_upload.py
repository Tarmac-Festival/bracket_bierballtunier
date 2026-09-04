import base64
import binascii
from uuid import uuid4

import aiofiles
import aiofiles.os

# Logos come in through forms that are plain JSON, so a picture travels as a data URL.
# Everything about it is checked here before anything is written.
MAX_LOGO_BYTES = 2 * 1024 * 1024

# What the file starts with, rather than what it claims to be called.
_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
)


def _decode(data_url: str) -> bytes:
    payload = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
    try:
        return base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("The logo is not readable") from exc


async def save_uploaded_logo(data_url: str | None, folder: str) -> str | None:
    """
    Writes an uploaded logo into `folder` and returns the file name to store alongside
    whatever it belongs to, or None when no logo was sent.
    """
    if data_url is None or data_url.strip() == "":
        return None

    contents = _decode(data_url)

    if len(contents) > MAX_LOGO_BYTES:
        raise ValueError("The logo is larger than 2 MB")

    extension = next(
        (extension for signature, extension in _SIGNATURES if contents.startswith(signature)),
        None,
    )
    if extension is None:
        raise ValueError("The logo has to be a PNG or a JPEG")

    filename = f"{uuid4()}{extension}"
    await aiofiles.os.makedirs(f"static/{folder}", exist_ok=True)
    async with aiofiles.open(f"static/{folder}/{filename}", "wb") as f:
        await f.write(contents)

    return filename


async def remove_uploaded_logo(filename: str | None, folder: str) -> None:
    """
    Deletes a picture that nothing points at any more. A missing file is not a problem: the
    point is that it is gone.
    """
    if filename is None:
        return

    try:
        await aiofiles.os.remove(f"static/{folder}/{filename}")
    except FileNotFoundError:
        pass
