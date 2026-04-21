declare module 'uuid' {
  export function v4(options?: any): string;
  export function v1(options?: any): string;
  export function v3(options?: any): string;
  export function v4str(): string;
  export function v5(options?: any): Uint8Array;
  export function v6(options?: any): Uint8Array;
  export function v7(options?: any): Uint8Array;
  export function v1to7(domain: number[]): Uint8Array;
  export function v7tov1(buf: Uint8Array): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): string;
}
