import {expect, it} from 'vitest';
import {embedSource} from './embeds';

it.each([
  'https://youtu.be/aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://m.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://youtube.com/shorts/aqz-KE-bpKQ',
  'https://youtube.com/embed/aqz-KE-bpKQ',
  'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
])('classifies %s as a privacy-enhanced YouTube source', (url) => {
  expect(embedSource(url)).toEqual({
    kind: 'youtube',
    src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
  });
});

it.each(['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456'])(
  'classifies %s as a Vimeo source',
  (url) => {
    expect(embedSource(url)).toEqual({
      kind: 'vimeo',
      src: 'https://player.vimeo.com/video/123456',
    });
  },
);

it('keeps audio providers as iframe sources', () => {
  expect(embedSource('https://soundcloud.com/artist/track')).toEqual({
    kind: 'iframe',
    provider: 'soundcloud',
    src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack&auto_play=false',
  });
  expect(embedSource('https://open.spotify.com/embed/track/abc123')).toEqual({
    kind: 'iframe',
    provider: 'spotify',
    src: 'https://open.spotify.com/embed/track/abc123',
  });
});

it.each([
  'javascript:alert(1)',
  'https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ',
  'https://youtube-nocookie.com.evil.test/embed/aqz-KE-bpKQ',
  'https://user:password@youtube.com/watch?v=aqz-KE-bpKQ',
  'https://youtube.com/watch?v=invalid',
  'https://vimeo.com/invalid',
  'https://example.com/project',
])('rejects unsupported or unsafe source %s', (url) => {
  expect(embedSource(url)).toBeUndefined();
});
