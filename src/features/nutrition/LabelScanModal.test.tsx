import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/app/providers/toast';
import type * as ImageModule from '@/lib/ai/image';
import { LabelScanModal } from './LabelScanModal';

const mocks = vi.hoisted(() => ({ analyze: vi.fn(), isAvailable: vi.fn(), compress: vi.fn() }));
vi.mock('@/lib/ai/httpAnalyzer', () => ({ getAnalyzer: () => mocks }));
vi.mock('@/lib/ai/image', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageModule>()),
  compressImage: mocks.compress,
}));

const photo = {
  dataUrl: 'data:image/jpeg;base64,cGhvdG8=',
  base64: 'cGhvdG8=',
  mimeType: 'image/jpeg',
};
const failure = { ok: false, status: 429, error: 'Servidor ocupado.' };
const label = {
  productName: 'Yogur',
  calories: 100,
  protein: 10,
  carbs: 10,
  fat: 2,
  confidence: 0.8,
  warnings: [],
  servingSize: 100,
  servingUnit: 'g',
};

function show() {
  return render(
    <ToastProvider>
      <LabelScanModal open onClose={vi.fn()} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mocks.isAvailable.mockResolvedValue(true);
  mocks.compress.mockResolvedValue(photo);
  mocks.analyze.mockResolvedValue(failure);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LabelScanModal', () => {
  it('separa la cámara de la fototeca y reintenta sin pedir otra foto', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByLabelText('Tomar foto de etiqueta')).toHaveAttribute(
      'capture',
      'environment',
    );
    const library = screen.getByLabelText('Elegir imagen de fototeca');
    expect(library).not.toHaveAttribute('capture');
    await user.upload(library, new File(['photo'], 'pantallazo.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor ocupado.');
    expect(screen.getByAltText('Etiqueta seleccionada')).toHaveAttribute('src', photo.dataUrl);
    mocks.analyze.mockResolvedValueOnce({ ok: true, analysis: label });
    await user.click(screen.getByRole('button', { name: 'Reintentar con esta imagen' }));
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Yogur'));
    expect(mocks.compress).toHaveBeenCalledTimes(1);
    expect(mocks.analyze).toHaveBeenNthCalledWith(2, {
      base64: photo.base64,
      mimeType: photo.mimeType,
    });
    expect(screen.getByAltText('Etiqueta seleccionada')).toBeInTheDocument();
  });

  it('conserva el nombre y la referencia al pasar a entrada manual tras un error', async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByLabelText('Nombre del producto (opcional)'), 'Avena');
    await user.upload(
      screen.getByLabelText('Elegir imagen de fototeca'),
      new File(['photo'], 'foto.jpg', { type: 'image/jpeg' }),
    );
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Crear manualmente' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Avena');
    expect(screen.getByAltText('Etiqueta seleccionada')).toHaveAttribute('src', photo.dataUrl);
  });

  it('descarta una respuesta tardía si se cerró el formulario', async () => {
    let resolveAnalysis!: (value: unknown) => void;
    mocks.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve;
        }),
    );
    const user = userEvent.setup();
    show();
    await user.upload(
      screen.getByLabelText('Elegir imagen de fototeca'),
      new File(['photo'], 'foto.jpg', { type: 'image/jpeg' }),
    );
    await waitFor(() => expect(mocks.analyze).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await act(async () => resolveAnalysis({ ok: true, analysis: label }));
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Etiqueta seleccionada')).not.toBeInTheDocument();
  });

  it('rechaza archivos inválidos antes de enviarlos', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Elegir imagen de fototeca'), {
      target: { files: [new File(['text'], 'notas.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG o WebP');
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.compress).not.toHaveBeenCalled();
  });
});
