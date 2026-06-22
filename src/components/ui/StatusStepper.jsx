import { Clock, FileText, Users, CheckCircle2 } from 'lucide-react';

const StatusStepper = ({ status }) => {
  const stages = [
    { id: 'Pending Owner', icon: <Clock size={12} />, productionId: 'Pending Production Head' },
    { id: 'Pending Admin', icon: <FileText size={12} /> },
    { id: 'Pending Head', icon: <Users size={12} />, productionId: 'Pending Program Head' },
    { id: 'Approved', icon: <CheckCircle2 size={12} /> }
  ];
  const currentIndex = stages.findIndex(s => s.id === status || s.productionId === status);
  const isCorrection = status === 'Correction Required';
  const isTerminal = ['Rejected', 'Cancelled'].includes(status);

  return (
    <div className="status-stepper-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} aria-label={`Current status: ${status}`}>
      {stages.map((stage, i) => {
        let nodeColor = 'var(--border)';
        let iconColor = 'var(--text-sub)';

        if (i < currentIndex || status === 'Approved') {
          nodeColor = 'var(--emerald-text)';
          iconColor = '#ffffff';
        } else if (i === currentIndex) {
          if (isCorrection) {
            nodeColor = 'var(--amber-text)';
            iconColor = '#ffffff';
          } else {
            nodeColor = 'var(--accent)';
            iconColor = '#ffffff';
          }
        } else if (isTerminal) {
          nodeColor = 'var(--rose-text)';
          iconColor = '#ffffff';
        }

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`stepper-node ${i < currentIndex || status === 'Approved' ? 'node-done' : i === currentIndex ? (isCorrection ? 'node-alert' : 'node-active') : isTerminal ? 'node-failed' : 'node-upcoming'}`}
              title={stage.productionId || stage.id}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: nodeColor,
                color: iconColor,
                flexShrink: 0,
                zIndex: 2
              }}
            >
              {i < currentIndex || status === 'Approved' ? <CheckCircle2 size={14} /> : stage.icon}
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: '8px', height: '2px', backgroundColor: i < currentIndex || (status === 'Approved' && i < stages.length - 1) ? 'var(--emerald-text)' : 'var(--border)', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatusStepper;
