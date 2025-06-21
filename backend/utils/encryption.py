from cryptography.fernet import Fernet
from utils.config import config

_fernet = None

def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = config.MESSAGE_ENCRYPTION_KEY
        if not key:
            raise ValueError("MESSAGE_ENCRYPTION_KEY not set")
        _fernet = Fernet(key.encode())
    return _fernet

def encrypt_text(text: str) -> str:
    f = get_fernet()
    return f.encrypt(text.encode()).decode()

def decrypt_text(token: str) -> str:
    f = get_fernet()
    return f.decrypt(token.encode()).decode()


def encrypt_json(data):
    import json
    if not isinstance(data, str):
        data = json.dumps(data)
    return encrypt_text(data)


def decrypt_json(data):
    import json
    decrypted = decrypt_text(data)
    try:
        return json.loads(decrypted)
    except json.JSONDecodeError:
        return decrypted

