export type AuthUser = {
    username: string;
    role: string;
};

export type LoginResponse = {
    token: string;
    user: AuthUser;
};

// localStorage['daaat.auth']에 저장되는 형태
export type StoredAuth = LoginResponse;