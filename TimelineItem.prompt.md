<!-- @dsCard group="Components" viewport="700x420" name="Core" subtitle="Buttons, tags, icon buttons, metrics, badges, status" -->
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="../../styles.css">
<style>
  body{margin:0;background:var(--bg-nebula);background-attachment:fixed;font-family:var(--font-body);color:var(--text);padding:26px}
  .group{margin-bottom:22px}
  .lbl{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px}
  .row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="../../_ds_bundle.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
  const { Button, Tag, IconButton, MetricStat, PresoBadge, StatusDot } = window.GPMAstrobiologyDesignSystem_e8cc9f;
  function Demo(){
    return (
      <div>
        <div className="group">
          <div className="lbl">Button</div>
          <div className="row">
            <Button variant="primary">Download CV</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="cta">Cientifica(mente)</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </div>
        <div className="group">
          <div className="lbl">Tag</div>
          <div className="row">
            <Tag>Mechanochemistry</Tag>
            <Tag>Prebiotic Chemistry</Tag>
            <Tag>Astrobiology</Tag>
            <Tag>Origin of Life</Tag>
          </div>
        </div>
        <div className="group">
          <div className="lbl">Icon button · Metric · Badge · Status</div>
          <div className="row">
            <IconButton label="Language">PT</IconButton>
            <IconButton label="Search">⌕</IconButton>
            <div style={{width:'1px',height:'40px',background:'var(--border)'}}></div>
            <MetricStat value="3" label="Publications" />
            <MetricStat value="2" label="h-index" />
            <div style={{width:'1px',height:'40px',background:'var(--border)'}}></div>
            <PresoBadge type="oral" />
            <PresoBadge type="poster" />
            <div style={{width:'1px',height:'40px',background:'var(--border)'}}></div>
            <StatusDot status="live" size={14} />
            <StatusDot status="warn" size={14} />
            <StatusDot status="danger" size={14} />
          </div>
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<Demo/>);
</script>
</body>
</html>
