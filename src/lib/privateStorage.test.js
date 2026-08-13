import { describe, expect, it } from "vitest";
import { storagePath } from "./privateStorage";

describe("storagePath", () => {
  const bucket = "activity-attachments";
  const path = "user-id/arquivo com espaco.jpg";

  it("preserva caminhos permanentes sem prefixo", () => {
    expect(storagePath(path, bucket)).toBe(path);
  });

  it("remove o prefixo do bucket de caminhos permanentes", () => {
    expect(storagePath(`${bucket}/user-id/foto.jpg`, bucket)).toBe("user-id/foto.jpg");
  });

  it("recupera o caminho de URLs assinadas antigas ou expiradas", () => {
    const url = `https://projeto.supabase.co/storage/v1/object/sign/${bucket}/user-id/arquivo%20com%20espaco.jpg?token=expirado`;
    expect(storagePath(url, bucket)).toBe(path);
  });

  it("recupera o caminho de URLs públicas antigas", () => {
    const url = `https://projeto.supabase.co/storage/v1/object/public/${bucket}/user-id/foto.jpg`;
    expect(storagePath(url, bucket)).toBe("user-id/foto.jpg");
  });
});
