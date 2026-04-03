import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Plus, Briefcase, Save, X, TrendingDown, History } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { Asset } from '../context/AppDataContext';
import {
  ASSET_TYPES,
  type AssetType,
  mergeAssetPosition,
} from '../utils/assetTypes';
import {
  filterOrdersLastThreeMonths,
  orderTotal,
  todayLocalIso,
} from '../utils/investmentOrders';
import './Investments.css';

const NEW_NAME_KEY = '__new__';

const TYPE_EMOJI: Record<AssetType, string> = {
  Funds: '📈',
  Stocks: '📊',
  Crypto: '₿',
  Gold: '🥇',
};

export default function Investments() {
  const { assets, setAssets, assetOrders, setAssetOrders, setLiquidCash } = useAppData();

  const [filterType, setFilterType] = useState<AssetType>('Funds');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<AssetType>('Funds');
  const [nameKey, setNameKey] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');

  const [sellTarget, setSellTarget] = useState<Asset | null>(null);
  const [sellUnits, setSellUnits] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  const namesForType = useMemo(() => {
    const set = new Set(assets.filter(a => a.type === formType).map(a => a.name));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [assets, formType]);

  useEffect(() => {
    if (namesForType.length > 0) {
      setNameKey(prev => (namesForType.includes(prev) ? prev : namesForType[0]));
    } else {
      setNameKey(NEW_NAME_KEY);
    }
    setNewName('');
  }, [formType, namesForType]);

  useEffect(() => {
    if (sellTarget) {
      setSellUnits(String(sellTarget.units));
      setSellPrice(String(sellTarget.value));
    } else {
      setSellUnits('');
      setSellPrice('');
    }
  }, [sellTarget]);

  const totalValue = useMemo(
    () => assets.reduce((acc, a) => acc + a.units * a.value, 0),
    [assets]
  );

  const valueByType = useMemo(() => {
    const m: Record<AssetType, number> = {
      Funds: 0,
      Stocks: 0,
      Crypto: 0,
      Gold: 0,
    };
    for (const a of assets) {
      m[a.type] += a.units * a.value;
    }
    return m;
  }, [assets]);

  const filteredHoldings = useMemo(
    () => assets.filter(a => a.type === filterType),
    [assets, filterType]
  );

  const recentOrders = useMemo(() => filterOrdersLastThreeMonths(assetOrders), [assetOrders]);

  const resolvedAssetName =
    nameKey === NEW_NAME_KEY ? newName.trim() : nameKey;

  const recordBuyOrder = (
    name: string,
    type: AssetType,
    u: number,
    p: number
  ) => {
    const id = Date.now();
    setAssetOrders(prev => [
      {
        id,
        side: 'buy',
        assetName: name,
        assetType: type,
        units: u,
        pricePerUnit: p,
        date: todayLocalIso(),
      },
      ...prev,
    ]);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const u = parseFloat(units);
    const p = parseFloat(price);
    if (!resolvedAssetName || !Number.isFinite(u) || u <= 0 || !Number.isFinite(p) || p < 0) return;

    setAssets(prev => {
      const match = prev.find(
        a =>
          a.type === formType &&
          a.name.trim().toLowerCase() === resolvedAssetName.toLowerCase()
      );
      if (match) {
        const { units: nu, value: nv } = mergeAssetPosition(match.units, match.value, u, p);
        return prev.map(a => (a.id === match.id ? { ...a, units: nu, value: nv } : a));
      }
      return [
        ...prev,
        {
          id: Date.now(),
          name: resolvedAssetName,
          type: formType,
          units: u,
          value: p,
        },
      ];
    });

    recordBuyOrder(resolvedAssetName, formType, u, p);

    setUnits('');
    setPrice('');
    setNewName('');
    setShowForm(false);
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTarget) return;
    const su = parseFloat(sellUnits);
    const sp = parseFloat(sellPrice);
    if (
      !Number.isFinite(su) ||
      su <= 0 ||
      su > sellTarget.units ||
      !Number.isFinite(sp) ||
      sp < 0
    ) {
      return;
    }

    const proceeds = orderTotal({ units: su, pricePerUnit: sp });
    setLiquidCash(lc => lc + proceeds);

    setAssets(prev => {
      const next = sellTarget.units - su;
      if (next <= 0) {
        return prev.filter(a => a.id !== sellTarget.id);
      }
      return prev.map(a =>
        a.id === sellTarget.id ? { ...a, units: next } : a
      );
    });

    setAssetOrders(prev => [
      {
        id: Date.now(),
        side: 'sell',
        assetName: sellTarget.name,
        assetType: sellTarget.type,
        units: su,
        pricePerUnit: sp,
        date: todayLocalIso(),
      },
      ...prev,
    ]);

    setSellTarget(null);
  };

  return (
    <div className="page-layout investments-page">
      {sellTarget && (
        <div
          className="sell-modal-backdrop"
          role="presentation"
          onClick={() => setSellTarget(null)}
        />
      )}
      {sellTarget && (
        <div className="sell-modal" role="dialog" aria-modal="true" aria-labelledby="sell-modal-title">
          <h2 id="sell-modal-title" className="sell-modal-title">
            Sell {sellTarget.name}
          </h2>
          <p className="text-secondary text-sm sell-modal-sub">
            {sellTarget.type} · You hold {sellTarget.units.toLocaleString()} units @ $
            {sellTarget.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            / unit
          </p>
          <form className="sell-modal-form" onSubmit={handleSellSubmit}>
            <div className="form-group">
              <label htmlFor="sell-units">Units to sell</label>
              <input
                id="sell-units"
                className="input-field"
                type="number"
                min="0"
                step="any"
                max={sellTarget.units}
                value={sellUnits}
                onChange={e => setSellUnits(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="sell-price">Price per unit ($)</label>
              <input
                id="sell-price"
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
                required
              />
            </div>
            <p className="text-tertiary text-xs sell-proceeds-preview">
              Proceeds (est.): $
              {Number.isFinite(parseFloat(sellUnits)) && Number.isFinite(parseFloat(sellPrice))
                ? orderTotal({
                    units: parseFloat(sellUnits),
                    pricePerUnit: parseFloat(sellPrice),
                  }).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '—'}{' '}
              → credited to liquid cash
            </p>
            <div className="sell-modal-actions">
              <Button variant="secondary" type="button" onClick={() => setSellTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <TrendingDown size={18} />
                Confirm sale
              </Button>
            </div>
          </form>
        </div>
      )}

      <header className="page-header">
        <div>
          <p className="page-eyebrow">Portfolio</p>
          <h1 className="page-title-display">Investment Portfolio</h1>
          <p className="text-secondary mt-1">
            Tap an asset type to view holdings, add positions, sell, and review recent trades.
          </p>
        </div>
        <Button
          variant="primary"
          type="button"
          aria-expanded={showForm}
          onClick={() => setShowForm(s => !s)}
          aria-label={showForm ? 'Close add asset form' : 'Add asset'}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Close' : 'Add asset'}</span>
        </Button>
      </header>

      {showForm && (
        <Card className="glass-panel investments-form-card">
          <CardHeader>
            <CardTitle>Add or top up holding</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="investments-form" onSubmit={handleAddAsset}>
              <div className="form-group form-group-full-width">
                <span className="input-label" id="inv-type-label">
                  Asset type
                </span>
                <div className="inv-type-chips" role="group" aria-labelledby="inv-type-label">
                  {ASSET_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`inv-type-chip ${formType === t ? 'is-selected' : ''}`}
                      onClick={() => setFormType(t)}
                      aria-pressed={formType === t}
                    >
                      <span className="inv-type-chip-emoji" aria-hidden>
                        {TYPE_EMOJI[t]}
                      </span>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group form-group-full-width">
                <label htmlFor="inv-asset-name">Asset name</label>
                {namesForType.length > 0 ? (
                  <>
                    <select
                      id="inv-asset-name"
                      className="input-field"
                      value={nameKey}
                      onChange={e => setNameKey(e.target.value)}
                      aria-label="Choose existing asset or create new"
                    >
                      {namesForType.map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                      <option value={NEW_NAME_KEY}>＋ New asset name…</option>
                    </select>
                    {nameKey === NEW_NAME_KEY && (
                      <input
                        className="input-field mt-1"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Vanguard Total Market"
                        required
                        maxLength={80}
                        aria-label="New asset name"
                      />
                    )}
                  </>
                ) : (
                  <input
                    id="inv-asset-name"
                    className="input-field"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={`First ${formType.toLowerCase()} holding name`}
                    required
                    maxLength={80}
                  />
                )}
                <p className="text-tertiary text-xs mt-1">
                  Same type + same name as an existing row merges units and averages price per unit.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="inv-units">Units to add</label>
                <input
                  id="inv-units"
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={units}
                  onChange={e => setUnits(e.target.value)}
                  required
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="inv-price">Price per unit ($)</label>
                <input
                  id="inv-price"
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="investments-form-actions">
                <Button variant="primary" type="submit" aria-label="Save asset">
                  <Save size={18} />
                  <span>Save holding</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="investments-summary-grid">
        <Card className="glass-panel summary-hero">
          <CardHeader>
            <CardTitle>Total portfolio value</CardTitle>
            <Briefcase className="text-accent" size={20} />
          </CardHeader>
          <CardContent>
            <h2 className="amount-display">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-secondary text-sm mt-2">
              {assets.length} open position{assets.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <div className="asset-type-cards" role="tablist" aria-label="Filter holdings by asset type">
          {ASSET_TYPES.map(type => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={filterType === type}
              aria-controls="investments-holdings-panel"
              id={`inv-tab-${type}`}
              className={`type-card-picker glass-panel type-card ${filterType === type ? 'is-selected' : ''}`}
              onClick={() => setFilterType(type)}
            >
              <div className={`type-icon type-icon-${type.toLowerCase()}`}>{TYPE_EMOJI[type]}</div>
              <div className="type-info">
                <span className="text-secondary text-sm">{type}</span>
                <span className="font-medium text-lg type-value-amount">
                  $
                  {valueByType[type].toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-tertiary text-xs type-earnings-caption">Total position value</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="glass-panel mt-6 investments-holdings-card">
        <CardHeader>
          <CardTitle id="holdings-heading">
            {filterType} holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="no-padding">
          <div
            id="investments-holdings-panel"
            role="tabpanel"
            aria-labelledby={`inv-tab-${filterType}`}
            className="holdings-animate"
            key={filterType}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Holdings</TableHead>
                  <TableHead className="text-right">Price / unit</TableHead>
                  <TableHead className="text-right">Total value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHoldings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="empty-table-cell">
                      <div className="empty-state-inline">
                        <Briefcase size={28} strokeWidth={1.5} aria-hidden />
                        <span>
                          No {filterType.toLowerCase()} positions yet. Select another type or use Add asset.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHoldings.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <span className={`badge badge-type-${asset.type.toLowerCase()}`}>{asset.type}</span>
                      </TableCell>
                      <TableCell className="text-right text-secondary">
                        {asset.units.toLocaleString()} units
                      </TableCell>
                      <TableCell className="text-right text-secondary">
                        $
                        {asset.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-right">
                        $
                        {(asset.units * asset.value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          type="button"
                          className="btn-sell-compact"
                          onClick={() => setSellTarget(asset)}
                          aria-label={`Sell ${asset.name}`}
                        >
                          <TrendingDown size={16} />
                          Sell
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel mt-6 investments-history-card">
        <CardHeader>
          <CardTitle className="history-card-title">
            <History size={20} className="text-accent" aria-hidden />
            Completed orders (last 3 months)
          </CardTitle>
        </CardHeader>
        <CardContent className="no-padding">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Price / unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="empty-table-cell">
                    <div className="empty-state-inline">
                      <History size={28} strokeWidth={1.5} aria-hidden />
                      <span>No completed trades in the last three months.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-secondary text-sm">{o.date}</TableCell>
                    <TableCell>
                      <span className={`order-side-badge order-side--${o.side}`}>{o.side}</span>
                    </TableCell>
                    <TableCell className="font-medium">{o.assetName}</TableCell>
                    <TableCell>
                      <span className={`badge badge-type-${o.assetType.toLowerCase()}`}>{o.assetType}</span>
                    </TableCell>
                    <TableCell className="text-right text-secondary">{o.units.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-secondary">
                      $
                      {o.pricePerUnit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${orderTotal(o).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
