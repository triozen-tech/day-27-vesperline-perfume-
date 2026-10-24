import { footer } from "../content";
import Bottle from "./Bottle";

// FO15: the formula card with the bottle beside it, link columns, giant wordmark, concept note.
export default function VesperFooter() {
  const f = footer.formula;
  return (
    <footer className="v-footer" data-record-time="1.7">
      <div className="v-foot-top">
        <div className="v-foot-bottle">
          <Bottle h={300} anchor="footer" />
        </div>
        <div className="v-formula">
          <p className="v-formula-title font-display">
            {f.title} <span>· {f.status}</span>
          </p>
          <table>
            <tbody>
              {f.rows.map((r) => (
                <tr key={r[0]}>
                  <th>{r[0]}</th>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="v-foot-cols">
          {footer.cols.map((c) => (
            <div key={c.h}>
              <b>{c.h}</b>
              {c.l.map((l) => (
                <a key={l} href="#top">
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="v-wm" aria-hidden>
        <div className="v-wm-in">
          <p className="font-display v-wordmark">Vesperline</p>
          <p className="font-display v-wordmark v-wordmark-mirror">Vesperline</p>
        </div>
      </div>
      <p className="v-foot-note">{footer.note}</p>
    </footer>
  );
}
