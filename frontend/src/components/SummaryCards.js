import React from 'react';
import './SummaryCards.css';

const SummaryCards = ({ stats }) => {
  return (
    <div className="summary-cards">
      <div className="card card-total">
        <div className="card-title">
          <i className="fas fa-building"></i> Всего объектов
        </div>
        <div className="card-value">{stats.totalObjects}</div>
        <div className="card-trend">
          <i className="fas fa-info-circle"></i> Активных
        </div>
      </div>
      <div className="card card-inwork">
        <div className="card-title">
          <i className="fas fa-file-alt"></i> Сгенерировано
        </div>
        <div className="card-value">{stats.generatedActs}</div>
        <div className="card-trend">
          <i className="fas fa-info-circle"></i> Всего актов
        </div>
      </div>
      <div className="card card-overdue">
        <div className="card-title">
          <i className="fas fa-times-circle"></i> Отклонено
        </div>
        <div className="card-value">{stats.rejectedActs}</div>
        <div className="card-trend">
          <i className="fas fa-info-circle"></i> {stats.rejectedPercent}% от отправленных
        </div>
      </div>
      <div className="card card-approved">
        <div className="card-title">
          <i className="fas fa-check-circle"></i> Согласовано
        </div>
        <div className="card-value">{stats.approvedActs}/{stats.sentActs}</div>
        <div className="card-trend">
          <i className="fas fa-info-circle"></i> {stats.approvedPercent}% от отправленных
        </div>
      </div>
      <div className="card card-signed">
        <div className="card-title">
          <i className="fas fa-signature"></i> Подписано
        </div>
        <div className="card-value">{stats.signedActs || 0}/{stats.approvedActs || 0}</div>
        <div className="card-trend">
          <i className="fas fa-info-circle"></i> {stats.signedPercent || 0}% от согласованных
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;

