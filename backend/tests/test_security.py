from app.security import create_token, decode_token, hash_password, verify_password
from datetime import timedelta


def test_passwords_are_hashed_and_verifiable():
    raw_password = "Correct-Horse-Battery-2026!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed)
    assert not verify_password("not-the-password", hashed)


def test_long_passwords_are_supported_without_bcrypt_truncation():
    raw_password = "A" * 100
    hashed = hash_password(raw_password)

    assert verify_password(raw_password, hashed)
    assert not verify_password(raw_password[:-1] + "B", hashed)


def test_tokens_preserve_subject_and_type():
    encoded = create_token("42", "access", timedelta(minutes=5))

    claims = decode_token(encoded)

    assert claims["sub"] == "42"
    assert claims["type"] == "access"
