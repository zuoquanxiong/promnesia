import pytest # type: ignore
from more_itertools import ilen

from promnesia import Source


def test_minimal():
    '''
    Example of a smallest possible config, using a 'demo' source
    '''
    cfg = make('''
from promnesia import Source
from promnesia.sources import demo

SOURCES = [
    Source(demo.index),
]
''')
    assert ilen(cfg.sources) == 1
    assert all(isinstance(s, Source) for s in cfg.sources)
    # todo output dirs?
    index(cfg)


def test_sources_style():
    '''
    Testing 'styles' of specifying sources
    '''
    cfg = make('''
from promnesia import Source
from promnesia.sources import demo

SOURCES = [
    # you can pass arguments to index functions
    Source(demo.index, count=10, name='explicit name'),

    # or rely on the default argument!
    Source(demo.index, name='another name'),

    # or rely on default source name name (will be guessed as 'demo')
    Source(demo.index),

    # rely on default index function
    Source(demo),

    # no need for Source() either!
    demo,

    # I guess this is as simple as it possibly gets...
    'promnesia.sources.demo',

    # or, make it lazy
    lambda: Source(demo.index, name='lazy'),
]
    ''')

    srcs = cfg.sources
    assert all(isinstance(_, Source) for _ in cfg.sources)

    [s1, s2, s3, s4, s5, s6, s7] = srcs

    assert s1.name == 'explicit name'
    assert s2.name == 'another name'
    assert s3.name == 'demo'
    assert s4.name == 'demo'
    assert s5.name == 'demo'
    assert s6.name == 'demo'
    assert s7.name == 'lazy'

    index(cfg)
    # TODO assert on results count?


def test_sources_errors():
    '''
    Testing defensiveness of config against various errors
    '''
    cfg = make('''
SOURCES = [
    'non.existing.module',

    lambda: bad.attribute,

    'promnesia.sources.demo',
]
    ''')

    # nothing fails so far! It's defensive!
    srcs = list(cfg.sources)

    [e1, e2, s1] = srcs

    assert isinstance(e1, Exception)
    assert isinstance(e2, Exception)
    assert isinstance(s1, Source)

    errors = index(cfg, check=False)
    assert len(errors) == 2 # errors simply propagate
  


def test_no_sources():
    cfg = make('''
''')
    # raises because no SOURCES
    with pytest.raises(RuntimeError):
        list(cfg.sources)


def test_empty_sources():
    cfg = make('''
SOURCES = []
    ''')
    # raises because empty SOURCES
    with pytest.raises(RuntimeError):
        list(cfg.sources)



def test_legacy():
    cfg = make('''
from promnesia import Source
from promnesia.sources import demo
INDEXERS = [
    Source(demo.index, src='legacy name'),
]
    ''')

    [s1] = cfg.sources

    assert s1.name == 'legacy name'

    index(cfg)


from pathlib import Path
from tempfile import TemporaryDirectory

from promnesia.config import import_config, Config


def make(body: str) -> Config:
    with TemporaryDirectory() as td:
        tdir = Path(td)
        cp = tdir / 'cfg.py'
        cp.write_text(body)
        return import_config(cp)


def index(cfg: Config, check=True):
    import promnesia.config as config
    from promnesia.__main__ import _do_index
    config.instance = cfg
    try:
        errors = list(_do_index())
        if check:
            assert len(errors) == 0, errors
        # visits = cfg.output_dir / 'promnesia.sqlite'
        # TODO query visit count too
        return errors
    finally:
        config.reset()
