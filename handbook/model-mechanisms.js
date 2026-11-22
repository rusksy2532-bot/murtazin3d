// Coordinates in millimetres, Z up. Landmark positions lie on the displayed meshes.
// Pause uses the +12° pose; Duet moves the champagne assembly 5 mm along its insertion axis.
export const mechanismViews = {
  pause: {
    title: '«Пауза в движении» · рычаг отклонён на 12°',
    center: [0, 0, 0],
    dir: [0.36, -1, 0.1],
    span: 49,
    points: {
      pivot: { title: 'Ось маятника', at: [0.2354, -1.51, -0.259], dir: [0.52, -1, 0.24], span: 13 },
      lever: { title: 'Подвижный рычаг', at: [-1.9712, -0.657, -10.0435], dir: [0.24, -1, 0.08], span: 27 },
      inlay: { title: 'Золотая вставка', at: [0.0275, 1.2503, 10.3785], dir: [-0.25, -1, 0.08], span: 16 },
      pearl: { title: 'Верхняя жемчужина', at: [3.4152, -3.038, 16.3986], dir: [0.55, -1, 0.28], span: 13 },
      aquamarine: { title: 'Нижний аквамарин', at: [-2.357, -1.42, -16.5721], dir: [0.38, -1, 0.12], span: 13 }
    }
  },
  duet: {
    title: '«Дуэт» · накладка отведена на 5 мм',
    center: [0, -2, 1],
    dir: [0.65, -1, 0.76],
    span: 31,
    points: {
      joint: { title: 'Установочный штифт', at: [9.9324, -0.72, 0.4735], dir: [1, -0.48, 0.52], span: 13 },
      socket: { title: 'Продолговатое гнездо', at: [-9.6169, -5.04, 0.91], dir: [-1, 0.68, 0.45], span: 13 },
      teal: { title: 'Вставка в тёплом сплаве', at: [1.5788, -8.045, 12.0368], dir: [0.55, -1, 0.75], span: 15 },
      white: { title: 'Вставка в белом сплаве', at: [-1.1253, 0.6375, 12.1888], dir: [-0.55, 1, 0.7], span: 15 }
    }
  }
};
