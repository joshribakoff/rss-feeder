import { useEffect, useState } from 'react'
import type { Cluster } from './types'
import { useAuth } from './AuthContext'
import Login from './Login'

function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetch('/api')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch data')
        }
        return res.json()
      })
      .then(data => {
        setClusters(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [user])

  const toggleCluster = (clusterId: number) => {
    const newSelected = new Set(selectedClusters)
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId)
    } else {
      newSelected.add(clusterId)
    }
    setSelectedClusters(newSelected)
  }

  // Get all articles, filtered by selected clusters
  const allArticles = clusters.flatMap(cluster =>
    cluster.articles.map(article => ({
      ...article,
      clusterKeywords: cluster.keywords
    }))
  )

  const filteredArticles = selectedClusters.size === 0
    ? allArticles
    : allArticles.filter(article =>
        article.clusterId && selectedClusters.has(article.clusterId)
      )

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Login />
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>RSS Clusters</h1>
        <div className="user-info">
          {user.picture && <img src={user.picture} alt={user.name || 'User'} className="user-avatar" />}
          <span>{user.name || user.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="cluster-pills">
        {clusters.map(cluster => (
          <button
            key={cluster.id}
            className={`pill ${selectedClusters.has(cluster.id) ? 'selected' : ''}`}
            onClick={() => toggleCluster(cluster.id)}
          >
            {cluster.keywords}
            <span className="count">({cluster.articles.length})</span>
          </button>
        ))}
      </div>

      <div className="articles-list">
        {filteredArticles.map(article => (
          <div key={article.id} className="article">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="article-title"
            >
              {article.title}
            </a>
            {article.content && (
              <div className="article-content">{article.content}</div>
            )}
            <div className="article-meta">
              Feed: {article.feed.title || article.feed.url} | Cluster: {article.clusterKeywords}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
