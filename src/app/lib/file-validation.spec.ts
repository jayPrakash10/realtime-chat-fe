import { validateImageFile } from './file-validation';

describe('validateImageFile', () => {
  it('accepts JPG, PNG and WEBP up to 5 MB', () => {
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull();
    expect(validateImageFile(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('rejects other types with the API message', () => {
    expect(validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe('Only JPG, PNG and WEBP images are allowed');
  });

  it('rejects files over 5 MB with the API message', () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    expect(validateImageFile(big)).toBe('Image must be 5 MB or smaller');
  });
});
